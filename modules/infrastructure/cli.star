# CLI Infrastructure Module - Manages Hyperlane CLI service setup

constants_module = import_module("../config/constants.star")
get_constants = constants_module.get_constants

helpers_module = import_module("../utils/helpers.star")
safe_get = helpers_module.safe_get
join_strings = helpers_module.join_strings
format_key_value_pairs = helpers_module.format_key_value_pairs
create_persistent_directory = helpers_module.create_persistent_directory

constants = get_constants()

# ============================================================================
# CLI SERVICE BUILDER
# ============================================================================


def build_cli_service(plan, chains, global_settings, deployer_key):
    """
    Build and deploy the Hyperlane CLI service

    Args:
        plan: Kurtosis plan object
        chains: List of chain configurations
        global_settings: Global configuration settings
        deployer_key: Deployer private key

    Returns:
        Comma-separated list of chain names
    """
    # Extract chain information
    chain_info = extract_chain_info(chains)

    # Build CLI environment variables
    cli_env = build_cli_environment(chain_info, global_settings, deployer_key)

    # Use pre-built image instead of building
    cli_image = constants.HYPERLANE_CLI_IMAGE

    # Create persistent configs directory
    configs_dir = create_persistent_directory("configs")

    # Add the CLI service to the plan
    plan.add_service(
        name="hyperlane-cli",
        config=ServiceConfig(
            image=cli_image,
            env_vars=cli_env,
            files={
                constants.CONFIGS_DIR: configs_dir,
            },
        ),
    )

    return chain_info.relay_chains


# ============================================================================
# CHAIN INFORMATION EXTRACTION
# ============================================================================


def sanitize_chain_name(name):
    """
    Sanitize chain name for Hyperlane CLI compatibility
    Removes hyphens, underscores, and spaces to create alphanumeric-only names

    Args:
        name: Original chain name (e.g., "cheerful-owl", "brave_lion")

    Returns:
        Sanitized name (e.g., "cheerfulowl", "bravelion")
    """
    if not name:
        return ""

    # Remove all non-alphanumeric characters and convert to lowercase
    # This ensures compatibility with Hyperlane CLI v18.2.0
    # In Starlark, we need to use string methods instead of iteration
    lower_name = name.lower()
    sanitized = ""

    # Use index-based iteration for Starlark compatibility
    for i in range(len(lower_name)):
        char = lower_name[i]
        # Check if character is alphanumeric (a-z, 0-9)
        if (char >= 'a' and char <= 'z') or (char >= '0' and char <= '9'):
            sanitized += char

    return sanitized


def extract_chain_info(chains):
    """
    Extract and format chain information for CLI

    Args:
        chains: List of chain configurations

    Returns:
        Structured chain information
    """
    chain_names = []
    rpc_pairs = {}
    id_pairs = {}

    for chain in chains:
        original_name = getattr(chain, "name", "")
        # Sanitize the chain name for Hyperlane CLI compatibility
        name = sanitize_chain_name(original_name)

        # Note: Chain name is sanitized from '{}' to '{}' for Hyperlane CLI compatibility
        # (Can't use print in Kurtosis Starlark)

        chain_names.append(name)

        # Add RPC URL
        rpc_url = getattr(chain, "rpc_url", "")
        rpc_pairs[name] = rpc_url

        # Add chain ID if available
        chain_id = getattr(chain, "chain_id", None)
        if chain_id != None:
            id_pairs[name] = str(chain_id)

    return struct(
        chain_names=chain_names,
        relay_chains=join_strings(chain_names, ","),
        chain_rpcs=format_key_value_pairs(rpc_pairs, "=", ","),
        chain_ids=format_key_value_pairs(id_pairs, "=", ","),
    )


# ============================================================================
# ENVIRONMENT CONFIGURATION
# ============================================================================


def build_cli_environment(chain_info, global_settings, deployer_key):
    """
    Build environment variables for CLI service

    Args:
        chain_info: Extracted chain information
        global_settings: Global configuration settings
        deployer_key: Deployer private key

    Returns:
        Dictionary of environment variables
    """
    env_vars = {
        "CLI_VERSION": str(global_settings.cli_version),
        "REGISTRY_MODE": str(global_settings.registry_mode),
        "CHAIN_NAMES": chain_info.relay_chains,
        "CHAIN_RPCS": chain_info.chain_rpcs,
        "CHAIN_IDS": chain_info.chain_ids,
        "HYP_KEY": str(deployer_key),
        # Additional environment variables for scripts
        "CONFIGS_DIR": constants.CONFIGS_DIR,
        "REGISTRY_DIR": constants.REGISTRY_DIR,
        "MAX_RETRY_ATTEMPTS": str(constants.MAX_RETRY_ATTEMPTS),
        "RETRY_DELAY": str(constants.RETRY_DELAY),
        "TEMPLATE_DIR": "/templates",
        # Hyperlane CLI environment variables for custom chains
        "HYP_REGISTRY": constants.REGISTRY_DIR,
        "HYP_CHAINS_FILE": constants.REGISTRY_DIR + "/chains.yaml",
        # Force redeploy core contracts even if registry has addresses (keeps versions aligned with agents)
        "FORCE_DEPLOY_CORE": "true",
        # Enable verbose output from the Node generator when needed
        "DEBUG": "1",
        "RUN_CORE_APPLY": "true" if global_settings.run_core_apply else "false",
        "RUN_IGP_FUND": "true" if global_settings.run_igp_fund else "false",
        "IGP_FUND_AMOUNT": str(global_settings.igp_fund_amount),
        # Use deterministic template-based configs to avoid interactive CLI prompts
        "SKIP_HYPERLANE_CORE_INIT": "true",
    }

    # Pass AWS credentials to CLI for S3 policy management if configured
    if hasattr(global_settings, "s3"):
        s3 = global_settings.s3
        if getattr(s3, "access_key_id", ""):
            env_vars["AWS_ACCESS_KEY_ID"] = s3.access_key_id
        if getattr(s3, "secret_access_key", ""):
            env_vars["AWS_SECRET_ACCESS_KEY"] = s3.secret_access_key
        if getattr(s3, "session_token", ""):
            env_vars["AWS_SESSION_TOKEN"] = s3.session_token
        if getattr(s3, "region", ""):
            env_vars["AWS_REGION"] = s3.region
        if getattr(s3, "bucket", ""):
            env_vars["S3_BUCKET"] = s3.bucket
        if getattr(s3, "region", ""):
            env_vars["S3_REGION"] = s3.region
        if getattr(s3, "prefix", ""):
            env_vars["S3_PREFIX"] = s3.prefix
        if getattr(s3, "folder", ""):
            env_vars["S3_FOLDER"] = s3.folder

    # Add ISM configuration if provided
    if hasattr(global_settings, "ism"):
        ism = global_settings.ism
        env_vars["ISM_TYPE"] = str(ism.type)

        # Add validators if present (comma-separated)
        if len(ism.validators) > 0:
            env_vars["ISM_VALIDATORS"] = join_strings(ism.validators, ",")

        # Add threshold if present
        if ism.threshold > 0:
            env_vars["ISM_THRESHOLD"] = str(ism.threshold)

        # Add relayer if present
        if ism.relayer:
            env_vars["ISM_RELAYER"] = str(ism.relayer)

        # Add owner/pauser for pausable ISM
        if ism.owner:
            env_vars["ISM_OWNER"] = str(ism.owner)
        if ism.pauser:
            env_vars["ISM_PAUSER"] = str(ism.pauser)

    return env_vars


# ============================================================================
# CLI OPERATIONS
# ============================================================================


def execute_cli_command(plan, command, description=""):
    """
    Execute a command in the CLI service

    Args:
        plan: Kurtosis plan object
        command: Command to execute
        description: Optional description of the command
    """
    plan.exec(
        service_name="hyperlane-cli",
        recipe=ExecRecipe(
            command=["sh", "-lc", command],
        ),
    )
