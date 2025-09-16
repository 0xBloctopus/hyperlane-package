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
    plan, validator, chains, agent_image, configs_dir, checkpoints_dir
):
    """
    Build and deploy a validator service

    Args:
        plan: Kurtosis plan object
        validator: Validator configuration
        chains: List of chain configurations
        agent_image: Docker image for the agent
        configs_dir: Configs directory artifact
    """
    chain_name = getattr(validator, "chain", "")

    # Find the chain configuration
    chain = find_item(chains, "name", chain_name)
    if not chain:
        fail("No configuration found for validator chain: {}".format(chain_name))

    # Get validator key directly
    validator_key = getattr(validator, "signing_key", "")

    # Build environment variables
    env_vars = build_validator_env(validator, chain)

    # Build simple direct command arguments
    # No shell interpretation, no string concatenation
    # Use /tmp for checkpoints to avoid permission issues with mounted volumes
    # Use sanitized chain name to match agent config
    sanitized_name = sanitize_chain_name(chain_name)
    validator_args = [
        "--config", "/configs/agent-config.json",
        "--originChainName", sanitized_name,
        "--validator.key", validator_key,
        "--checkpointSyncer.type", "localStorage",
        "--checkpointSyncer.path", "/tmp/validator-checkpoints"
    ]

    # Add the service to the plan with direct entrypoint
    plan.add_service(
        name="validator-{}".format(chain_name),
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


def build_validator_env(validator, chain):
    """
    Build environment variables for validator service

    Args:
        validator: Validator configuration
        chain: Chain configuration

    Returns:
        Dictionary of environment variables
    """
    base_env = {
        "VALIDATOR_KEY": getattr(validator, "signing_key", ""),
        "ORIGIN_CHAIN": getattr(chain, "name", ""),
        "RPC_URL": getattr(chain, "rpc_url", ""),
        "CONFIG_FILES": "/configs/agent-config.json",
        "RUST_LOG": "info",
    }

    # Add checkpoint syncer configuration
    syncer_env = build_checkpoint_syncer_env(
        getattr(validator, "checkpoint_syncer", struct())
    )

    # Merge environments
    for key, value in syncer_env.items():
        base_env[key] = value

    return base_env


def build_checkpoint_syncer_env(checkpoint_syncer):
    """
    Build environment variables for checkpoint syncer

    Args:
        checkpoint_syncer: Checkpoint syncer configuration

    Returns:
        Dictionary of syncer-specific environment variables
    """
    syncer_type = getattr(checkpoint_syncer, "type", "")
    params = getattr(checkpoint_syncer, "params", struct())
    env = {}

    if syncer_type == constants.CHECKPOINT_SYNCER_LOCAL:
        env["CHECKPOINT_SYNCER_TYPE"] = "local"
        env["CHECKPOINT_SYNCER_PATH"] = safe_get(
            params, "path", constants.VALIDATOR_CHECKPOINTS_DIR
        )

    elif syncer_type == constants.CHECKPOINT_SYNCER_S3:
        env["CHECKPOINT_SYNCER_TYPE"] = "s3"
        bucket = safe_get(params, "bucket", "")
        if bucket:
            env["S3_BUCKET"] = str(bucket)
        region = safe_get(params, "region", "")
        if region:
            env["S3_REGION"] = str(region)
        prefix = safe_get(params, "prefix", "")
        if prefix:
            env["S3_PREFIX"] = str(prefix)
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
    plan, validators, chains, agent_image, configs_dir, checkpoints_dir
):
    """
    Deploy all configured validators

    Args:
        plan: Kurtosis plan object
        validators: List of validator configurations
        chains: List of chain configurations
        agent_image: Docker image for agents
        configs_dir: Configs directory artifact
    """
    if len(validators) == 0:
        # log_info("No validators to deploy")
        return

    # log_info("Deploying {} validators".format(len(validators)))

    for validator in validators:
        build_validator_service(
            plan,
            validator,
            chains,
            agent_image,
            configs_dir,
            checkpoints_dir,
        )
