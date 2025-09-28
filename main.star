# Hyperlane Kurtosis Package - Main Orchestrator
# This is the entry point that coordinates all modules for deploying Hyperlane infrastructure

# ============================================================================
# MODULE IMPORTS
# ============================================================================

# Configuration modules
constants_module = import_module("./modules/config/constants.star")
parser_module = import_module("./modules/config/parser.star")
validator_module = import_module("./modules/config/validator.star")

# Contract deployment modules
core_module = import_module("./modules/contracts/core.star")
warp_module = import_module("./modules/contracts/warp.star")

# Infrastructure modules
cli_module = import_module("./modules/infrastructure/cli.star")
agents_module = import_module("./modules/infrastructure/agents.star")

# Service modules
validator_service = import_module("./modules/services/validator.star")
relayer_service = import_module("./modules/services/relayer.star")

# Testing modules
test_module = import_module("./modules/testing/send_test.star")

# Utility modules
helpers_module = import_module("./modules/utils/helpers.star")

# Get constants
constants = constants_module.get_constants()

# ============================================================================
# MAIN ORCHESTRATION
# ============================================================================


def run(plan, args):
    """
    Main entry point for the Hyperlane package

    Args:
        plan: Kurtosis plan object
        args: User-provided arguments

    Returns:
        None
    """
    plan.print("Starting Hyperlane deployment")

    # ========================================
    # PHASE 1: Configuration Parsing
    # ========================================

    plan.print("Phase 1: Parsing configuration")

    # Parse main configuration
    config = parser_module.parse_configuration(args)

    # Parse sub-configurations
    agent_config = parser_module.parse_agent_config(config.agents)
    global_settings = parser_module.parse_global_config(config.global_config)
    test_config = parser_module.parse_test_config(config.send_test)

    # ========================================
    # PHASE 2: Configuration Validation
    # ========================================

    plan.print("Phase 2: Validating configuration")

    # Validate entire configuration
    validator_module.validate_configuration(config)

    # ========================================
    # PHASE 3: Infrastructure Setup
    # ========================================

    plan.print("Phase 3: Setting up infrastructure")

    # Create persistent directories
    configs_dir = helpers_module.create_persistent_directory("configs")

    # Build and deploy CLI service
    relay_chains = cli_module.build_cli_service(
        plan, config.chains, global_settings, agent_config.deployer_key
    )

    # ========================================
    # PHASE 4: Contract Deployment
    # ========================================

    plan.print("Phase 4: Deploying contracts")

    # If using a non-default ISM, force a fresh core deployment to apply new ISM
    if getattr(global_settings, "ism", struct()).type and global_settings.ism.type != "trustedRelayer":
        plan.exec(
            service_name="hyperlane-cli",
            recipe=ExecRecipe(
                command=[
                    "sh", "-lc",
                    "echo 'Forcing core re-deploy due to ISM change' && rm -f /configs/.done-core-* /configs/.deploy-core /configs/registry/chains/*/addresses.yaml || true && ls -l /configs/registry/chains/* || true"
                ],
            ),
        )

    # Deploy core contracts if needed and capture addresses
    contract_addresses = core_module.deploy_core_contracts(plan, config.chains, agent_config.deployer_key)

    # Deploy warp routes
    warp_module.deploy_warp_routes(plan, config.warp_routes)

    # ========================================
    # PHASE 5: Agent Configuration
    # ========================================

    plan.print("Phase 5: Generating agent configuration")

    # Build and run agent configuration generator service with validators
    validators = agent_config.validators
    agents_module.build_agent_config_service(plan, config.chains, configs_dir, validators, global_settings)

    # Verify agent configuration has correct addresses
    plan.exec(
        service_name="hyperlane-cli",
        recipe=ExecRecipe(
            command=[
                "sh",
                "-c",
                """
                echo "Verifying agent configuration..."
                
                # Wait for agent-config.json to be created
                max_wait=30
                elapsed=0
                while [ ! -f /configs/agent-config.json ] && [ $elapsed -lt $max_wait ]; do
                    echo "Waiting for agent config to be generated..."
                    sleep 2
                    elapsed=$((elapsed + 2))
                done
                
                if [ -f /configs/agent-config.json ]; then
                    echo "Agent config generated successfully"
                    # Extract and display mailbox addresses for verification
                    echo "Configured mailbox addresses:"
                    cat /configs/agent-config.json | grep -A2 -B2 "mailbox" | head -20
                    # Strict validation: require mailbox and validatorAnnounce for all chains
                    node -e '
                      const fs=require("fs");
                      const j=JSON.parse(fs.readFileSync("/configs/agent-config.json","utf8"));
                      const missing=[];
                      for(const [name,conf] of Object.entries(j.chains||{})){
                        if(!conf.mailbox||!conf.validatorAnnounce){ missing.push(name); }
                      }
                      if(missing.length){
                        console.error("ERROR: Missing mailbox/validatorAnnounce for chains:", missing.join(", "));
                        process.exit(1);
                      } else {
                        console.log("Core addresses present for all chains.");
                      }
                    '
                    echo "Auto-funding validator chain signers if needed..."
                    node -e '
                      const { execSync } = require("child_process");
                      const fs=require("fs");
                      const yaml = require("yaml");
                      const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
                      const getBalance = (rpc, addr) => {
                        const balHex = execSync(`cast rpc eth_getBalance ${addr} latest --rpc-url ${rpc}`).toString().trim();
                        return BigInt(balHex.replace(/"/g, ""));
                      };
                      const ensureFunded = (chain, rpc, addr, fundingKey) => {
                        for (let attempt = 1; attempt <= 3; attempt++) {
                          let bal = 0n;
                          try {
                            bal = getBalance(rpc, addr);
                          } catch (err) {
                            console.error(`Balance check failed for ${addr} on ${chain}: ${err.message}`);
                          }
                          if (bal >= min) {
                            console.log(`Sufficient balance for ${addr} on ${chain}`);
                            return;
                          }
                          console.log(`Funding ${addr} on ${chain} (attempt ${attempt}/3)...`);
                          try {
                            const tx = execSync(`cast send ${addr} --value ${topUpValue} --private-key ${fundingKey} --rpc-url ${rpc} --legacy`, { stdio: "pipe" });
                            console.log(`Funded ${addr} on ${chain}: ${tx.toString().trim()}`);
                          } catch (err) {
                            console.error(`Funding tx failed for ${addr} on ${chain}: ${err.message}`);
                          }
                          sleep(1500);
                        }
                        let finalBalance = 0n;
                        try {
                          finalBalance = getBalance(rpc, addr);
                        } catch (err) {
                          console.error(`Post-funding balance check failed for ${addr} on ${chain}: ${err.message}`);
                        }
                        if (finalBalance < min) {
                          console.warn(`Auto-funding exhausted retries for ${addr} on ${chain}; final balance ${finalBalance}`);
                        } else {
                          console.log(`Balance for ${addr} on ${chain} now ${finalBalance}`);
                        }
                      };
                      const j=JSON.parse(fs.readFileSync("/configs/agent-config.json","utf8"));
                      const chains=j.chains||{};
                      const validatorsKeys = [];
                      try {
                        const cfgRaw = fs.readFileSync("/work/input-config.yaml","utf8");
                        const parsed = yaml.parse(cfgRaw) || {};
                        let validatorEntries = [];
                        if (Array.isArray(parsed?.validators)) {
                          validatorEntries = parsed.validators;
                        } else if (Array.isArray(parsed?.agents?.validators)) {
                          validatorEntries = parsed.agents.validators;
                        }
                        for (const entry of validatorEntries) {
                          if (!entry) continue;
                          const raw = typeof entry.signing_key === "string" ? entry.signing_key.trim() : "";
                          if (!raw) continue;
                          const normalized = raw.startsWith("0x") ? raw : `0x${raw}`;
                          validatorsKeys.push(normalized);
                        }
                      } catch (e) {
                        console.error("Failed to parse validators from /work/input-config.yaml:", e.message);
                      }
                      console.log(`Validator keys discovered for auto-funding: ${validatorsKeys.length}`);
                      const rpcByName = {};
                      for (const [n,c] of Object.entries(chains)) {
                        const rpc = (c.rpcUrls&&c.rpcUrls[0]&&c.rpcUrls[0].http)||c.connection?.url;
                        if (rpc) rpcByName[n]=rpc;
                      }
                      const uniq = new Map();
                      for (const key of validatorsKeys){
                        try{ const out = execSync(`cast wallet address --private-key ${key}`); const addr=out.toString().trim(); uniq.set(addr,key);}catch(e){}
                      }
                      const hypKey = process.env.HYP_KEY || "";
                      const fundingKey = hypKey ? (hypKey.startsWith("0x") ? hypKey : `0x${hypKey}`) : "";
                      if (!fundingKey) {
                        console.log("HYP_KEY not provided; skipping validator auto funding");
                        process.exit(0);
                      }
                      const min = 900_000_000_000_000_000n; // 0.9 ETH keeps validators above large announce fees
                      const topUpValue = "1ether"; // aggressive top-up for custom chains with expensive announces
                      for (const [n,rpc] of Object.entries(rpcByName)){
                        for (const addr of uniq.keys()){
                          ensureFunded(n, rpc, addr, fundingKey);
                        }
                      }
                    '
                else
                    echo "ERROR: Agent config was not generated!"
                    exit 1
                fi
            """,
            ],
        ),
    )

    # Ensure minimal chains.yaml exists for CLI even if core isn't redeployed
    chains_yaml = ""
    for ch in config.chains:
        name = getattr(ch, "name", "")
        cid = str(getattr(ch, "chain_id", getattr(ch, "chainId", 0)))
        chains_yaml += "{}:\n  chainId: {}\n  protocol: ethereum\n".format(name, cid)

    plan.exec(
        service_name="hyperlane-cli",
        recipe=ExecRecipe(
            command=[
                "sh",
                "-lc",
                """
                set -e
                mkdir -p /configs/registry
                cat > /configs/registry/chains.yaml << 'EOF'
                {content}
                EOF
                echo "Wrote /configs/registry/chains.yaml"
                cat /configs/registry/chains.yaml
                """.format(content=chains_yaml),
            ],
        ),
    )

    # Patch checkpointSyncer in agent-config.json if global storage mode demands it (s3/gcs)
    if getattr(global_settings, "checkpoint_storage", "localStorage") == "s3" and len(agent_config.validators) == 0:
        bucket = getattr(global_settings.s3, "bucket", "")
        region = getattr(global_settings.s3, "region", "")
        folder = getattr(global_settings.s3, "folder", "validator")
        prefix = getattr(global_settings.s3, "prefix", "")
        # 1) Update agent-config.json to set S3 checkpoint syncer defaults when validators are not configured
        plan.exec(
            service_name="hyperlane-cli",
            recipe=ExecRecipe(
                command=[
                    "sh",
                    "-lc",
                    (
                        "export BUCKET='" + bucket + "' REGION='" + region + "' FOLDER='" + folder + "' PREFIX='" + prefix + "'; " +
                        "node -e 'const fs=require(\"fs\");const f=\"/configs/agent-config.json\";let j=JSON.parse(fs.readFileSync(f));"+
                        "const folder=process.env.FOLDER||\"validator\";"+
                        "const cfg={type:\"s3\",bucket:process.env.BUCKET,region:process.env.REGION,folder};"+
                        "const prefix=(process.env.PREFIX||\"\").trim();if(prefix){cfg.prefix=prefix;}"+
                        "j.checkpointSyncer=cfg;"+
                        "fs.writeFileSync(f,JSON.stringify(j,null,2));console.log(\"checkpointSyncer set to S3 fallback config\", JSON.stringify(cfg));'"
                    ),
                ],
            ),
        )
        # Note: We no longer attempt to set S3 bucket policies from inside the container.
        # Please ensure the bucket policy allows relayer reads (e.g., public read or IAM permissions).
    elif getattr(global_settings, "checkpoint_storage", "localStorage") == "gcs" and len(agent_config.validators) == 0:
        bucket = getattr(global_settings.gcs, "bucket", "")
        folder = getattr(global_settings.gcs, "folder", "")
        plan.exec(
            service_name="hyperlane-cli",
            recipe=ExecRecipe(
                command=[
                    "sh",
                    "-lc",
                    (
                        "BUCKET='" + bucket + "' FOLDER='" + folder + "' " +
                        "node -e 'const fs=require(\"fs\");const f=\"/configs/agent-config.json\";let j=JSON.parse(fs.readFileSync(f));"+
                        "j.checkpointSyncer={type:\"gcs\",bucket:process.env.BUCKET"+
                        (" ,folder:process.env.FOLDER" if folder else "")+
                        "};fs.writeFileSync(f,JSON.stringify(j,null,2));console.log(\"checkpointSyncer set to GCS\");'"
                    ),
                ],
            ),
        )

    # ========================================
    # PHASE 6: Storage Mode (local/s3/gcs) via agent config
    # ========================================
    # Storage is fully controlled by agent-config.json (validators.checkpoint_syncer)

    # ========================================
    # PHASE 7: Agent Services Deployment
    # ========================================

    plan.print("Phase 7: Deploying agent services")

    # Get agent Docker image
    agent_image = agents_module.get_agent_image(global_settings.agent_tag)

    # Create shared checkpoints directory (used by localStorage mode)
    checkpoints_dir = helpers_module.create_persistent_directory(
        "validator-checkpoints"
    )

    # Only seed/check chmod when running in local storage mode
    if getattr(global_settings, "checkpoint_storage", "localStorage") == "localStorage":
        plan.add_service(
            name="checkpoints-init",
            config=ServiceConfig(
                image="alpine:3.19",
                entrypoint=["/bin/sh", "-lc"],
                files={
                    constants.VALIDATOR_CHECKPOINTS_DIR: checkpoints_dir,
                },
                cmd=[
                    "mkdir -p {dir}/validator-sepolia {dir}/validator-arbitrumsepolia && chmod -R 777 {dir} && tail -f /dev/null".format(
                        dir=constants.VALIDATOR_CHECKPOINTS_DIR
                    )
                ],
            ),
        )

    validator_service.deploy_validators(
        plan,
        agent_config.validators,
        config.chains,
        agent_image,
        configs_dir,
        checkpoints_dir,
        global_settings,
    )

    # Deploy relayer
    relayer_service.build_relayer_service(
        plan,
        config.chains,
        relay_chains,
        agent_config.relayer_key,
        agent_config.allow_local_sync,
        global_settings,
        agent_image,
        configs_dir,
        checkpoints_dir,
    )

    # ========================================
    # PHASE 8: Testing
    # ========================================

    plan.print("Phase 8: Running tests")

    # Run send test if configured
    test_module.run_send_test(plan, test_config, config.warp_routes)

    # ========================================
    # COMPLETION
    # ========================================

    plan.print("Hyperlane deployment completed successfully")
    
    # Prepare deployment info with validator addresses
    validator_addresses = []
    if agent_config.validators:
        for v in agent_config.validators:
            # Extract signing_key from validator config (it's a struct, access directly)
            if v.signing_key:
                validator_addresses.append(v.signing_key)
            else:
                validator_addresses.append("N/A")
    
    deployment_info = struct(
        deployer_address=agent_config.deployer_key if agent_config.deployer_key else "N/A",
        relayer_address=agent_config.relayer_key if agent_config.relayer_key else "N/A",
        validators=validator_addresses,
    )

    # Return comprehensive deployment summary
    return struct(
        chains=len(config.chains),
        validators=len(agent_config.validators),
        warp_routes=len(config.warp_routes),
        test_enabled=test_config.enabled,
        contracts_addresses=contract_addresses,  # All contract addresses for UI display
        deployment_info=deployment_info,  # Additional deployment information
    )
