# Configuration Validator Module - Validates configuration according to business rules

constants_module = import_module("./constants.star")
get_constants = constants_module.get_constants

constants = get_constants()

# ============================================================================
# CHAIN NAME UTILITIES
# ============================================================================

def normalize_chain_name(name):
    """
    Normalize chain name to lowercase and validate format
    
    Args:
        name: Chain name to normalize
        
    Returns:
        Normalized name if valid, None if invalid
    """
    if not name:
        return None
        
    # Convert to lowercase for consistency
    normalized = name.lower()
    
    # Check length constraints
    if len(normalized) < 3 or len(normalized) > 20:
        return None
        
    # Basic validation - Starlark limitations prevent complex regex
    # Check that it starts with a letter
    if not normalized[0].isalpha():
        return None
    
    # Simple character validation for Starlark
    valid_chars = "abcdefghijklmnopqrstuvwxyz0123456789-_"
    for i in range(len(normalized)):
        if normalized[i] not in valid_chars:
            return None
            
    return normalized


def is_reserved_chain_name(name):
    """
    Check if chain name conflicts with Hyperlane reserved names
    
    Args:
        name: Normalized chain name to check
        
    Returns:
        True if reserved, False otherwise
    """
    reserved_names = [
        "hyperlane", "core", "warp", "agent", "validator", "relayer",
        "mailbox", "multisigism", "ism", "checkpoint", "merkle"
    ]
    
    # Check exact match
    if name in reserved_names:
        return True
        
    # Check if it starts with reserved prefixes
    for reserved in reserved_names:
        if name.startswith(reserved + "-") or name.startswith(reserved + "_"):
            return True
            
    return False


def get_chain_name_mapping():
    """
    Get mapping of common chain name variations to canonical names
    
    Returns:
        Dictionary mapping variations to canonical names
    """
    return {
        # Ethereum testnets
        "eth-sepolia": "sepolia",
        "ethereum-sepolia": "sepolia", 
        "sepolia-testnet": "sepolia",
        "eth-goerli": "goerli",
        "ethereum-goerli": "goerli",
        "goerli-testnet": "goerli",
        
        # Base variations
        "base-sepolia": "basesepolia",
        "base-sepolia-testnet": "basesepolia",
        "basesepolia-testnet": "basesepolia", 
        "base_sepolia": "basesepolia",
        
        # Other common variations
        "arbitrum-sepolia": "arbitrumsepolia",
        "arbitrum_sepolia": "arbitrumsepolia",
        "optimism-sepolia": "optimismsepolia",
        "optimism_sepolia": "optimismsepolia",
        "polygon-mumbai": "mumbai",
        "polygon_mumbai": "mumbai"
    }


def resolve_chain_name(name):
    """
    Resolve chain name using normalization and mapping
    
    Args:
        name: Original chain name
        
    Returns:
        Tuple of (resolved_name, is_custom) where is_custom indicates if this is a custom name
    """
    normalized = normalize_chain_name(name)
    if not normalized:
        return None, False
        
    # Check if it maps to a known canonical name
    mapping = get_chain_name_mapping()
    if normalized in mapping:
        return mapping[normalized], False
        
    # Check if it's already a canonical name
    canonical_names = ["sepolia", "basesepolia", "goerli", "mumbai", "arbitrumsepolia", "optimismsepolia"]
    if normalized in canonical_names:
        return normalized, False
        
    # It's a custom name
    return normalized, True


def is_valid_chain_name(name):
    """
    Check if chain name has valid format (legacy function for backward compatibility)
    
    Args:
        name: Chain name to validate
        
    Returns:
        True if valid, False otherwise
    """
    resolved, _ = resolve_chain_name(name)
    return resolved != None

# ============================================================================
# MAIN VALIDATION
# ============================================================================


def validate_configuration(config):
    """
    Validate the entire configuration

    Args:
        config: Parsed configuration object

    Returns:
        None if valid, fails with error message if invalid
    """
    # Validate chains
    validate_chains(config.chains)

    # Validate agents
    validate_agents(config.agents)

    # Validate warp routes
    validate_warp_routes(config.warp_routes, config.chains)

    # Validate test configuration
    validate_test_config(config.send_test, config.chains)


# ============================================================================
# CHAIN VALIDATION
# ============================================================================


def validate_chains(chains):
    """
    Validate chain configuration

    Args:
        chains: List of chain configurations
    """
    # Check minimum number of chains
    if len(chains) < constants.MIN_CHAINS_REQUIRED:
        fail(
            "At least {} chains are required, got {}".format(
                constants.MIN_CHAINS_REQUIRED, len(chains)
            )
        )

    # Check for duplicate chain names and normalize them
    chain_names = []
    resolved_names = []
    for chain in chains:
        # Access chain name properly
        chain_name = getattr(chain, "name", "")
        if not chain_name:
            fail("Chain name is required")

        # Resolve the chain name
        resolved_name, is_custom = resolve_chain_name(chain_name)
        if not resolved_name:
            fail("Invalid chain name format: {}. Chain names must be alphanumeric with optional hyphens/underscores, 3-20 characters long.".format(chain_name))
        
        # Check for duplicate original names
        if chain_name in chain_names:
            fail("Duplicate chain name: {}".format(chain_name))
            
        # Check for duplicate resolved names
        if resolved_name in resolved_names:
            fail("Chain name '{}' resolves to '{}' which conflicts with another chain. Use a more specific name.".format(chain_name, resolved_name))
        
        chain_names.append(chain_name)
        resolved_names.append(resolved_name)

        # Validate RPC URL
        chain_rpc = getattr(chain, "rpc_url", "")
        if not chain_rpc:
            fail("RPC URL is required for chain: {}".format(chain_name))

        # Check for potential conflicts with reserved names
        if is_reserved_chain_name(resolved_name):
            fail("Chain name '{}' conflicts with reserved Hyperlane naming. Consider using a prefix like 'custom-{}'.".format(chain_name, chain_name))


# ============================================================================
# AGENT VALIDATION
# ============================================================================


def validate_agents(agents):
    """
    Validate agent configuration

    Args:
        agents: Agent configuration object
    """
    # Validate deployer key if core deployment is needed
    # Commented out print statements as they're not supported in Kurtosis
    # if not agents.deployer_key:
    #     print("Warning: No deployer key provided. Core deployment will fail if attempted.")

    # Validate relayer configuration
    # if not agents.relayer_key:
    #     print("Warning: No relayer key provided. Relayer will not be able to sign transactions.")

    # Validate validators - agents is a struct from parsed config
    validators = getattr(agents, "validators", [])
    for validator in validators:
        validator_chain = getattr(validator, "chain", "")
        if not validator_chain:
            fail("Validator chain is required")

        validator_key = getattr(validator, "signing_key", "")
        if not validator_key:
            fail("Validator signing key is required for chain: {}".format(validator_chain))


# ============================================================================
# WARP ROUTE VALIDATION
# ============================================================================


def validate_warp_routes(warp_routes, chains):
    """
    Validate warp route configuration

    Args:
        warp_routes: List of warp route configurations
        chains: List of chain configurations for reference
    """
    # Get chain names for reference
    chain_names = []
    for chain in chains:
        chain_names.append(getattr(chain, "name", ""))

    for route in warp_routes:
        # Validate source chain
        source_chain = getattr(route, "source_chain", "")
        if not source_chain:
            fail("Warp route source chain is required")

        if source_chain not in chain_names:
            fail("Warp route source chain '{}' not found in chains configuration".format(source_chain))

        # Validate destination chain
        dest_chain = getattr(route, "destination_chain", "")
        if not dest_chain:
            fail("Warp route destination chain is required")

        if dest_chain not in chain_names:
            fail("Warp route destination chain '{}' not found in chains configuration".format(dest_chain))

        # Validate token configuration
        token_symbol = getattr(route, "token_symbol", "")
        if not token_symbol:
            fail("Warp route token symbol is required")


# ============================================================================
# TEST CONFIGURATION VALIDATION
# ============================================================================


def validate_test_config(test_config, chains):
    """
    Validate test configuration

    Args:
        test_config: Test configuration object
        chains: List of chain configurations for reference
    """
    # Test configuration is optional
    if not test_config:
        return

    # Validate test chains if specified
    test_enabled = getattr(test_config, "enabled", False)
    if test_enabled:
        # Get chain names for reference
        chain_names = []
        for chain in chains:
            chain_names.append(getattr(chain, "name", ""))

        source_chain = getattr(test_config, "source_chain", "")
        if source_chain and source_chain not in chain_names:
            fail("Test source chain '{}' not found in chains configuration".format(source_chain))

        dest_chain = getattr(test_config, "destination_chain", "")
        if dest_chain and dest_chain not in chain_names:
            fail("Test destination chain '{}' not found in chains configuration".format(dest_chain))