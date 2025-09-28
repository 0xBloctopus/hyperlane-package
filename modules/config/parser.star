# Configuration Parser Module - Handles parsing and structuring of configuration

constants_module = import_module("./constants.star")
get_constants = constants_module.get_constants

helpers_module = import_module("../utils/helpers.star")
safe_get = helpers_module.safe_get
as_bool = helpers_module.as_bool

validator_module = import_module("./validator.star")
resolve_chain_name = validator_module.resolve_chain_name

ism_module = import_module("./ism_config.star")
build_ism_config = ism_module.build_ism_config
validate_ism_config = ism_module.validate_ism_config

mainnet_addresses_module = import_module("./mainnet_addresses.star")
get_mainnet_addresses = mainnet_addresses_module.get_mainnet_addresses
get_testnet_addresses = mainnet_addresses_module.get_testnet_addresses
get_addresses_by_chain_id = mainnet_addresses_module.get_addresses_by_chain_id

constants = get_constants()

# ============================================================================
# MAIN CONFIGURATION PARSER
# ============================================================================


def parse_configuration(args):
    """
    Parse and structure the main configuration from arguments

    Args:
        args: Raw arguments passed to the package

    Returns:
        Structured configuration object
    """
    # Parse chains into structs
    raw_chains = safe_get(args, "chains", [])
    parsed_chains = []
    for chain in raw_chains:
        parsed_chains.append(parse_chain_config(chain))

    # Parse warp routes into structs
    raw_warp_routes = safe_get(args, "warp_routes", [])
    parsed_warp_routes = []
    for route in raw_warp_routes:
        parsed_warp_routes.append(parse_warp_route(route))

    config = struct(
        chains=parsed_chains,
        agents=safe_get(args, "agents", {}),
        warp_routes=parsed_warp_routes,
        send_test=safe_get(args, "send_test", {}),
        global_config=safe_get(args, "global", {}),
    )

    return config


# ============================================================================
# AGENT CONFIGURATION PARSER
# ============================================================================


def parse_ism_config(ism_config):
    """
    Parse ISM configuration with enhanced type support

    Args:
        ism_config: Raw ISM configuration

    Returns:
        Structured ISM configuration
    """
    # Validate the ISM configuration first
    validate_ism_config(ism_config)
    
    # Parse basic ISM structure
    parsed_ism = struct(
        type=safe_get(ism_config, "type", "trustedRelayer"),
        validators=safe_get(ism_config, "validators", []),
        threshold=safe_get(ism_config, "threshold", 1),
        relayer=safe_get(ism_config, "relayer", ""),
        owner=safe_get(ism_config, "owner", ""),
        pauser=safe_get(ism_config, "pauser", ""),
        modules=safe_get(ism_config, "modules", []),
        domains=safe_get(ism_config, "domains", {}),
    )
    
    return parsed_ism


def parse_agent_config(agents):
    """
    Extract and structure agent configuration

    Args:
        agents: Raw agent configuration

    Returns:
        Structured agent configuration
    """
    relayer_cfg = safe_get(agents, "relayer", {})
    deployer_cfg = safe_get(agents, "deployer", {})

    # Parse validators into structs
    raw_validators = safe_get(agents, "validators", [])
    parsed_validators = []
    for validator in raw_validators:
        parsed_validators.append(parse_validator_config(validator))

    return struct(
        relayer_key=safe_get(relayer_cfg, "key", ""),
        allow_local_sync=as_bool(
            safe_get(relayer_cfg, "allow_local_checkpoint_syncers", True), True
        ),
        deployer_key=safe_get(deployer_cfg, "key", ""),
        validators=parsed_validators,
    )


# ============================================================================
# GLOBAL CONFIGURATION PARSER
# ============================================================================


def parse_global_config(global_config):
    """
    Extract global configuration settings

    Args:
        global_config: Raw global configuration

    Returns:
        Structured global settings
    """
    # Parse ISM configuration if provided
    raw_ism = safe_get(global_config, "ism", {})
    parsed_ism = parse_ism_config(raw_ism)

    return struct(
        agent_tag=safe_get(
            global_config, "agent_tag", constants.DEFAULT_AGENT_TAG
        ),
        ism=parsed_ism,
        cli_version=safe_get(
            global_config, "cli_version", constants.DEFAULT_CLI_VERSION
        ),
        registry_mode=safe_get(
            global_config, "registry_mode", constants.DEFAULT_REGISTRY_MODE
        ),
        run_core_apply=as_bool(
            safe_get(
                global_config,
                "run_core_apply",
                constants.RUN_CORE_APPLY_DEFAULT,
            ),
            constants.RUN_CORE_APPLY_DEFAULT,
        ),
        run_igp_fund=as_bool(
            safe_get(
                global_config,
                "run_igp_fund",
                constants.RUN_IGP_FUND_DEFAULT,
            ),
            constants.RUN_IGP_FUND_DEFAULT,
        ),
        igp_fund_amount=safe_get(
            global_config,
            "igp_fund_amount",
            constants.DEFAULT_IGP_FUND_AMOUNT,
        ),
        checkpoint_storage=safe_get(
            global_config, "checkpoint_storage", "localStorage"
        ),
        # Optional global storage params to apply to all validators if not specified per-validator
        s3=struct(
            bucket=safe_get(safe_get(global_config, "s3", {}), "bucket", ""),
            region=safe_get(safe_get(global_config, "s3", {}), "region", ""),
            prefix=safe_get(safe_get(global_config, "s3", {}), "prefix", ""),
            folder=safe_get(safe_get(global_config, "s3", {}), "folder", ""),
            access_key_id=safe_get(safe_get(global_config, "s3", {}), "access_key_id", ""),
            secret_access_key=safe_get(safe_get(global_config, "s3", {}), "secret_access_key", ""),
            session_token=safe_get(safe_get(global_config, "s3", {}), "session_token", ""),
        ),
        gcs=struct(
            bucket=safe_get(safe_get(global_config, "gcs", {}), "bucket", ""),
            folder=safe_get(safe_get(global_config, "gcs", {}), "folder", ""),
            service_account_key=safe_get(safe_get(global_config, "gcs", {}), "service_account_key", ""),
            user_secrets=safe_get(safe_get(global_config, "gcs", {}), "user_secrets", ""),
        ),
        # Additional ISM build configuration for deployment
        ism_build_config=build_ism_config(raw_ism, ""),
    )


# ============================================================================
# CHAIN CONFIGURATION PARSER
# ============================================================================


def parse_chain_config(chain):
    """
    Parse individual chain configuration

    Args:
        chain: Raw chain configuration

    Returns:
        Structured chain configuration
    """
    original_name = safe_get(chain, "name", "")
    resolved_name, is_custom = resolve_chain_name(original_name)

    # Get configuration values
    chain_id = safe_get(chain, "chain_id", None)
    use_existing = as_bool(safe_get(chain, "use_existing", False), False)
    deploy_core = as_bool(safe_get(chain, "deploy_core", False), False)
    existing_addresses = safe_get(chain, "existing_addresses", {})

    # If use_existing is true, try to find official addresses
    if use_existing and not existing_addresses:
        # Try to find addresses by chain name first
        official_addresses = get_mainnet_addresses(original_name.lower())
        if not official_addresses:
            official_addresses = get_testnet_addresses(original_name.lower())

        # If not found by name, try by chain ID
        if not official_addresses and chain_id:
            official_addresses = get_addresses_by_chain_id(chain_id)

        # If found, populate existing_addresses
        if official_addresses:
            existing_addresses = {
                "mailbox": official_addresses.get("mailbox", ""),
                "validatorAnnounce": official_addresses.get("validatorAnnounce", ""),
                "interchainGasPaymaster": official_addresses.get("interchainGasPaymaster", ""),
                "interchainSecurityModule": official_addresses.get("interchainSecurityModule", ""),
                "interchainAccountRouter": official_addresses.get("interchainAccountRouter", ""),
                "merkleTreeHook": official_addresses.get("merkleTreeHook", ""),
                "proxyAdmin": official_addresses.get("proxyAdmin", ""),
                "testRecipient": official_addresses.get("testRecipient", ""),
                # ISM factories
                "domainRoutingIsmFactory": official_addresses.get("domainRoutingIsmFactory", ""),
                "staticAggregationHookFactory": official_addresses.get("staticAggregationHookFactory", ""),
                "staticAggregationIsmFactory": official_addresses.get("staticAggregationIsmFactory", ""),
                "staticMerkleRootMultisigIsmFactory": official_addresses.get("staticMerkleRootMultisigIsmFactory", ""),
                "staticMessageIdMultisigIsmFactory": official_addresses.get("staticMessageIdMultisigIsmFactory", ""),
            }
            # If we found addresses, don't deploy core
            deploy_core = False

    # Store both original and resolved names for reference
    return struct(
        name=original_name,  # Keep original name for display purposes
        normalized_name=resolved_name,  # Use normalized name for internal operations
        is_custom_name=is_custom,
        rpc_url=safe_get(chain, "rpc_url", ""),
        chain_id=chain_id,
        deploy_core=deploy_core,
        use_existing=use_existing,
        existing_addresses=existing_addresses,
    )


# ============================================================================
# WARP ROUTE PARSER
# ============================================================================


def parse_warp_route(warp_route):
    """
    Parse warp route configuration

    Args:
        warp_route: Raw warp route configuration

    Returns:
        Structured warp route configuration
    """
    # Parse initial liquidity into structs
    raw_liquidity = safe_get(warp_route, "initialLiquidity", [])
    parsed_liquidity = []
    for liq in raw_liquidity:
        parsed_liquidity.append(
            struct(
                chain=safe_get(liq, "chain", ""), amount=safe_get(liq, "amount", "0")
            )
        )

    return struct(
        symbol=safe_get(warp_route, "symbol", constants.DEFAULT_ROUTE_SYMBOL),
        mode=safe_get(warp_route, "mode", constants.DEFAULT_WARP_MODE),
        decimals=safe_get(warp_route, "decimals", 18),
        topology=safe_get(warp_route, "topology", {}),
        token_addresses=safe_get(warp_route, "token_addresses", {}),
        owner=safe_get(warp_route, "owner", ""),
        initial_liquidity=parsed_liquidity,
    )


# ============================================================================
# VALIDATOR CONFIGURATION PARSER
# ============================================================================


def parse_validator_config(validator):
    """
    Parse validator configuration

    Args:
        validator: Raw validator configuration

    Returns:
        Structured validator configuration
    """
    checkpoint_syncer = safe_get(validator, "checkpoint_syncer", {})
    params = safe_get(checkpoint_syncer, "params", {})

    # Parse params into a struct
    parsed_params = struct(
        path=safe_get(params, "path", ""),
        bucket=safe_get(params, "bucket", ""),
        region=safe_get(params, "region", ""),
        folder=safe_get(params, "folder", ""),
        service_account_key=safe_get(params, "service_account_key", ""),
        user_secrets=safe_get(params, "user_secrets", ""),
    )

    return struct(
        chain=safe_get(validator, "chain", ""),
        signing_key=safe_get(validator, "signing_key", ""),
        checkpoint_syncer=struct(
            type=safe_get(checkpoint_syncer, "type", constants.CHECKPOINT_SYNCER_LOCAL),
            params=parsed_params,
        ),
    )


# ============================================================================
# TEST CONFIGURATION PARSER
# ============================================================================


def parse_test_config(send_test):
    """
    Parse test configuration

    Args:
        send_test: Raw test configuration

    Returns:
        Structured test configuration
    """
    return struct(
        enabled=as_bool(safe_get(send_test, "enabled", False), False),
        origin=safe_get(send_test, "origin", constants.DEFAULT_TEST_ORIGIN),
        destination=safe_get(
            send_test, "destination", constants.DEFAULT_TEST_DESTINATION
        ),
        amount=safe_get(send_test, "amount", constants.DEFAULT_TEST_AMOUNT),
    )
