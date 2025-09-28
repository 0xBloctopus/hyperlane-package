# Validator Service Module - Builds and manages validator services

constants_module = import_module("../config/constants.star")
get_constants = constants_module.get_constants

helpers_module = import_module("../utils/helpers.star")
safe_get = helpers_module.safe_get
log_info = helpers_module.log_info
find_item = helpers_module.find_item

cli_module = import_module("../infrastructure/cli.star")
sanitize_chain_name = cli_module.sanitize_chain_name

constants = get_constants()

# ============================================================================
# VALIDATOR SERVICE BUILDER
# ============================================================================


def build_validator_service(
    plan,
    validator,
    chains,
    agent_image,
    configs_dir,
    checkpoints_dir,
    global_settings,
    chain_signer_key=None,
    instance_index=1,
):
    """
    Build and deploy a validator service

    Args:
        plan: Kurtosis plan object
        validator: Validator configuration
        chains: List of chain configurations
        agent_image: Docker image for the agent
        configs_dir: Configs directory artifact
        checkpoints_dir: Checkpoints directory artifact
        minio_details: MinIO service details for S3-compatible storage (optional)
    """
    chain_name = getattr(validator, "chain", "")

    # Find the chain configuration
    chain = find_item(chains, "name", chain_name)
    if not chain:
        fail("No configuration found for validator chain: {}".format(chain_name))

    # Get validator key directly
    validator_key = getattr(validator, "signing_key", "")

    # Sanitize chain name for consistency
    sanitized_name = sanitize_chain_name(chain_name)

    # Build environment variables with sanitized chain name
    env_vars = build_validator_env(validator, chain, sanitized_name, global_settings, chain_signer_key)

    # Build validator arguments
    validator_args = [
        "--config", "/configs/agent-config.json",
        "--originChainName", sanitized_name,
        "--validator.key", validator_key,
    ]

    # Prefer global storage mode for CLI args; fallback to local
    global_type = getattr(global_settings, "checkpoint_storage", "localStorage")
    if global_type == "s3":
        s3 = getattr(global_settings, "s3", struct())
        validator_args.extend([
            "--checkpointSyncer.type", "s3",
            "--checkpointSyncer.bucket", getattr(s3, "bucket", ""),
            "--checkpointSyncer.region", getattr(s3, "region", "us-east-1"),
        ])
    elif global_type == "gcs":
        # Let config/env control gcs; no CLI flags required here
        pass
    else:
        local_path = "{}/validator-{}".format(constants.VALIDATOR_CHECKPOINTS_DIR, sanitized_name)
        validator_args.extend(["--checkpointSyncer.type", "localStorage", "--checkpointSyncer.path", local_path])

    # Add the service to the plan with direct entrypoint
    # Use sanitized name for the service name to avoid Kubernetes naming issues
    suffix = "" if instance_index == 1 else "-{}".format(instance_index)

    plan.add_service(
        name="validator-{}{}".format(sanitized_name, suffix),
        config=ServiceConfig(
            image=agent_image,
            env_vars=env_vars,
            files={
                constants.CONFIGS_DIR: configs_dir,
                constants.VALIDATOR_CHECKPOINTS_DIR: checkpoints_dir,
            },
            entrypoint=["/app/validator"],
            cmd=validator_args,
        ),
    )


# ============================================================================
# ENVIRONMENT CONFIGURATION
# ============================================================================


def build_validator_env(validator, chain, sanitized_name, global_settings, chain_signer_key=None):
    """
    Build environment variables for validator service

    Args:
        validator: Validator configuration
        chain: Chain configuration
        sanitized_name: Sanitized chain name without special characters

    Returns:
        Dictionary of environment variables
    """
    rpc_url = getattr(chain, "rpc_url", "")

    base_env = {
        "VALIDATOR_KEY": getattr(validator, "signing_key", ""),
        "ORIGIN_CHAIN": sanitized_name,  # Use sanitized name instead of chain.name
        "RPC_URL": rpc_url,
        "CONFIG_FILES": "/configs/agent-config.json",
        # Boost logs for announce path and RPC
        "RUST_LOG": "info,hyperlane_ethereum::contracts::validator_announce=debug,hyperlane_ethereum::rpc_clients=debug,hyperlane_base::types::s3_storage=trace,aws_config=trace,aws_sdk_s3=trace,aws_smithy_http=trace",
    }

    # Add checkpoint syncer configuration
    syncer_env = build_checkpoint_syncer_env(
        getattr(validator, "checkpoint_syncer", struct()), sanitized_name
    )
    # Inject cloud credentials if provided via global settings
    v_syncer = getattr(validator, "checkpoint_syncer", struct())
    v_type = getattr(v_syncer, "type", "")
    global_type = getattr(global_settings, "checkpoint_storage", "localStorage")
    eff_type = v_type if v_type in ["s3", "gcs", "localStorage"] else global_type
    if eff_type == "s3" or global_type == "s3":
        s3 = getattr(global_settings, "s3", struct())
        if getattr(s3, "access_key_id", ""):
            base_env["AWS_ACCESS_KEY_ID"] = s3.access_key_id
        if getattr(s3, "secret_access_key", ""):
            base_env["AWS_SECRET_ACCESS_KEY"] = s3.secret_access_key
        if getattr(s3, "session_token", ""):
            base_env["AWS_SESSION_TOKEN"] = s3.session_token
        if getattr(s3, "region", ""):
            base_env["AWS_REGION"] = s3.region
        # Also force override via HYP_ env vars (highest precedence among config sources)
        if getattr(s3, "bucket", ""):
            base_env["HYP_CHECKPOINTSYNCER_BUCKET"] = s3.bucket
        if getattr(s3, "region", ""):
            base_env["HYP_CHECKPOINTSYNCER_REGION"] = s3.region
        base_env["HYP_CHECKPOINTSYNCER_TYPE"] = "s3"
    elif eff_type == "localStorage":
        # In case the generated config still sets local path, align env var to our per-chain path
        default_local_path = "{}/validator-{}".format(constants.VALIDATOR_CHECKPOINTS_DIR, sanitized_name)
        base_env["HYP_CHECKPOINTSYNCER_TYPE"] = "localStorage"
        base_env["HYP_CHECKPOINTSYNCER_PATH"] = default_local_path

    # Explicitly set the chain signer; prefer provided chain_signer_key (e.g., deployer), fallback to validator key
    chosen_chain_signer_key = chain_signer_key if chain_signer_key else getattr(validator, "signing_key", "")
    base_env["HYP_CHAINS_{}_SIGNER_TYPE".format(sanitized_name.upper())] = "hexKey"
    base_env["HYP_CHAINS_{}_SIGNER_KEY".format(sanitized_name.upper())] = chosen_chain_signer_key

    # Merge environments
    for key, value in syncer_env.items():
        base_env[key] = value

    return base_env


def build_checkpoint_syncer_env(checkpoint_syncer, sanitized_name):
    """
    Build environment variables for checkpoint syncer

    Args:
        checkpoint_syncer: Checkpoint syncer configuration

    Returns:
        Dictionary of syncer-specific environment variables
    """
    syncer_type = getattr(checkpoint_syncer, "type", "localStorage")
    params = getattr(checkpoint_syncer, "params", struct())
    env = {}

    if syncer_type == constants.CHECKPOINT_SYNCER_LOCAL or syncer_type == "localStorage":
        env["CHECKPOINT_SYNCER_TYPE"] = "local"
        # Mirror the runtime arg path logic for consistency
        default_local_path = "{}/validator-{}".format(constants.VALIDATOR_CHECKPOINTS_DIR, sanitized_name)
        env["CHECKPOINT_SYNCER_PATH"] = safe_get(params, "path", default_local_path)

    elif syncer_type == constants.CHECKPOINT_SYNCER_S3:
        env["CHECKPOINT_SYNCER_TYPE"] = "s3"
        bucket = safe_get(params, "bucket", "")
        if bucket:
            env["S3_BUCKET"] = str(bucket)
            env["HYP_CHECKPOINTSYNCER_BUCKET"] = str(bucket)
        region = safe_get(params, "region", "")
        if region:
            env["S3_REGION"] = str(region)
            env["HYP_CHECKPOINTSYNCER_REGION"] = str(region)
        prefix = safe_get(params, "prefix", "")
        if prefix:
            env["S3_PREFIX"] = str(prefix)
            env["HYP_CHECKPOINTSYNCER_PREFIX"] = str(prefix)
        folder = safe_get(params, "folder", "")
        if folder:
            env["S3_FOLDER"] = str(folder)
            env["HYP_CHECKPOINTSYNCER_FOLDER"] = str(folder)
        basePath = safe_get(params, "basePath", "")
        if basePath:
            env["CHECKPOINT_BASE_PATH"] = str(basePath)

    elif syncer_type == constants.CHECKPOINT_SYNCER_GCS:
        env["CHECKPOINT_SYNCER_TYPE"] = "gcs"
        bucket_gcs = safe_get(params, "bucket", "")
        if bucket_gcs:
            env["S3_BUCKET"] = str(bucket_gcs)  # GCS uses same env var
        prefix_gcs = safe_get(params, "prefix", "")
        if prefix_gcs:
            env["S3_PREFIX"] = str(prefix_gcs)
        basePath_gcs = safe_get(params, "basePath", "")
        if basePath_gcs:
            env["CHECKPOINT_BASE_PATH"] = str(basePath_gcs)

    else:
        # Default to local
        env["CHECKPOINT_SYNCER_TYPE"] = "local"
        env["CHECKPOINT_SYNCER_PATH"] = "/validator-checkpoints"

    return env




# ============================================================================
# BATCH DEPLOYMENT
# ============================================================================


def deploy_validators(
    plan, validators, chains, agent_image, configs_dir, checkpoints_dir, global_settings, chain_signer_key=None
):
    """
    Deploy all configured validators

    Args:
        plan: Kurtosis plan object
        validators: List of validator configurations
        chains: List of chain configurations
        agent_image: Docker image for agents
        configs_dir: Configs directory artifact
        checkpoints_dir: Checkpoints directory artifact
        minio_details: MinIO service details for S3-compatible storage (optional)
    """
    if len(validators) == 0:
        # log_info("No validators to deploy")
        return

    # log_info("Deploying {} validators".format(len(validators)))

    chain_instance_counts = {}

    for validator in validators:
        chain_name = getattr(validator, "chain", "")
        current_index = chain_instance_counts.get(chain_name, 0) + 1
        chain_instance_counts[chain_name] = current_index

        build_validator_service(
            plan,
            validator,
            chains,
            agent_image,
            configs_dir,
            checkpoints_dir,
            global_settings,
            chain_signer_key,
            instance_index=current_index,
        )
