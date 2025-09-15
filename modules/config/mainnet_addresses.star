# Mainnet Addresses Module - Official Hyperlane contract addresses for major chains
# Source: https://github.com/hyperlane-xyz/hyperlane-registry

# ============================================================================
# MAINNET CONTRACT ADDRESSES
# ============================================================================

MAINNET_ADDRESSES = {
    "ethereum": {
        "chainId": 1,
        "domainId": 1,
        "mailbox": "0xc005dc82818d67AF737725bD4bf75435d065D239",
        "validatorAnnounce": "0xCe74905e51497b4adD3639366708b821dcBcff96",
        "interchainGasPaymaster": "0x9e6B1022bE9BBF5aFd152483DAD9b88911bC8611",
        "interchainSecurityModule": "0x9e7D21eC266Ffb43B7A7770557002002Cf52B128",
        "interchainAccountRouter": "0xC00b94c115742f711a6F9EA90373c33e9B72A4A9",
        "merkleTreeHook": "0x48e6c30B97748d1e2e03bf3e9FbE3890ca5f8CCA",
        "protocolFee": "0x8B05BF30F6247a90006c5837eA63C7905D79e6d8",
        "testRecipient": "0x36FdA966CfffF8a9Cdc814f546db0e6378bFef35",
        "proxyAdmin": "0x75EE15Ee1B4A75Fa3e2fDF5DF3253c25599cc659",
        # ISM factories
        "domainRoutingIsmFactory": "0x1052eF3419f26Bec74Ed7CEf4a4FA6812Bc09908",
        "staticAggregationHookFactory": "0xEb9FcFDC9EfDC17c1EC5E1dc085B98485da213D6",
        "staticAggregationIsmFactory": "0x1052eF3419f26Bec74Ed7CEf4a4FA6812Bc09908",
        "staticMerkleRootMultisigIsmFactory": "0x2C1FAbEcd7bFBdEBF27CcdB67baADB38b6Df90fC",
        "staticMessageIdMultisigIsmFactory": "0x8F7454AC98228f3504Bb91eA3D8Adafe6406110A",
    },
    "arbitrum": {
        "chainId": 42161,
        "domainId": 42161,
        "mailbox": "0x979Ca5202784112f4738403dBec5D0F3B9daabB9",
        "validatorAnnounce": "0x2aEcE1c96322aFd920F726c0b03eb78B616e23dB",
        "interchainGasPaymaster": "0x3b6044acd6767f017e99318AA6Ef93b7B06A5a22",
        "interchainSecurityModule": "0x12d289D009BaeFecb02b0efD7C0b6b23a3877135",
        "interchainAccountRouter": "0xF90A3d406C6F8321fe118861A357F4D7107760D7",
        "merkleTreeHook": "0x748040afB89B8FdBb992799808215419d36A0930",
        "protocolFee": "0xD0199067DACb8526e7dc524a4f85a00bC1162793",
        "testRecipient": "0x36FdA966CfffF8a9Cdc814f546db0e6378bFef35",
        "proxyAdmin": "0x80Cebd56A65e46c474a1A101e89E76C4c51D179c",
        # ISM factories
        "domainRoutingIsmFactory": "0xa2931C37957f3079d3B21b877d56E1db930e02a5",
        "staticAggregationHookFactory": "0x0761b0827849abbf7b0cC09CE14e1C93D87f5004",
        "staticAggregationIsmFactory": "0xEb9FcFDC9EfDC17c1EC5E1dc085B98485da213D6",
        "staticMerkleRootMultisigIsmFactory": "0x4Ed7d626f1E96cD1C0401607Bf70D95243E3dEd1",
        "staticMessageIdMultisigIsmFactory": "0xFEb9585b2f948c1eD74034205a7439261a9d27DD",
    },
    "optimism": {
        "chainId": 10,
        "domainId": 10,
        "mailbox": "0xd4C1905BB1D26BC93DAC913e13CaCC278CdCC80D",
        "validatorAnnounce": "0xa638E9fB9E123D78C3c0550769ba47449798640F",
        "interchainGasPaymaster": "0xD8A76C4D91fCbB7Cc8eA795DFDF870E48368995C",
        "interchainSecurityModule": "0x956c00650CA6C5b226d2D0dc71D65Ce302FCbD4a",
        "interchainAccountRouter": "0x8c25fD0fC2E419d0EEC14a2F1f0a09d24861E232",
        "merkleTreeHook": "0x68eE9bec9B4dbB61f69D9D293Ae26a5AACb2e28f",
        "protocolFee": "0xD71Ff941120e8f935b8b1E2C1eD72F5d140FF458",
        "testRecipient": "0x36FdA966CfffF8a9Cdc814f546db0e6378bFef35",
        "proxyAdmin": "0xE047cb95FB3b7117989e911c6afb34771183fC35",
        # ISM factories
        "domainRoutingIsmFactory": "0x809B79095e9A8Be4fC3cB52Bf09919F14Fc9DC24",
        "staticAggregationHookFactory": "0x160C28C92cA453570aD7C031972b58d5Dd128F72",
        "staticAggregationIsmFactory": "0x0761b0827849abbf7b0cC09CE14e1C93D87f5004",
        "staticMerkleRootMultisigIsmFactory": "0x8b83fefd896fAa52057798f6426E9f0B080FCCcE",
        "staticMessageIdMultisigIsmFactory": "0xAa0D34b3Ac6420B769b88e06e2f3359D96652F43",
    },
    "base": {
        "chainId": 8453,
        "domainId": 8453,
        "mailbox": "0xeA87ae93Fa0019a82A727bfd3eBd1cFCa8f64f1D",
        "validatorAnnounce": "0x84cb373148ef9112Eda93Fc3C6e321D6d1b03496",
        "interchainGasPaymaster": "0xC3F23848Ed2e04C0c6d41bd7804fa8f89F940B94",
        "interchainSecurityModule": "0xDA0d2AF2191fFd9825B5EfB8D73A236CEa7E0719",
        "interchainAccountRouter": "0x77f973C7b1c249783A7faaA5F15aC491091Ae8bF",
        "merkleTreeHook": "0x19dc38aeae620380430C200a6E990D5Af5480117",
        "protocolFee": "0x6b1bb4ce664Bb4164AEB4d3D2E7DE7450DD8084C",
        "testRecipient": "0x36FdA966CfffF8a9Cdc814f546db0e6378bFef35",
        "proxyAdmin": "0x4c803122128E87d661FB0E0088D5C5a94C13ec87",
        # ISM factories
        "domainRoutingIsmFactory": "0x6FF340AaC4Bf932ff3195ABaD2aca387fCe1F038",
        "staticAggregationHookFactory": "0xFd2552694ceC28F93436F37AFc8bFa8d4F956071",
        "staticAggregationIsmFactory": "0x160C28C92cA453570aD7C031972b58d5Dd128F72",
        "staticMerkleRootMultisigIsmFactory": "0xEF466cC0FA5C736Bc64f007230e9E3d3Ecd9Fb88",
        "staticMessageIdMultisigIsmFactory": "0x79c487CC88B02F2aFD5fe59A973F8cE72F12E66C",
    },
    "polygon": {
        "chainId": 137,
        "domainId": 137,
        "mailbox": "0x5d934f4e2f797775e53561bB72aca21ba36B96BB",
        "validatorAnnounce": "0x62E3e3Ed0bE694E5a11CeC1E3fbf7d8ebEdDeADd",
        "interchainGasPaymaster": "0x0071740Bf129b05C4684abfbBeD248D80971cce2",
        "interchainSecurityModule": "0xbB6d86209BcdB5B8fdc8A8B96ccCF7d8dd7c397F",
        "interchainAccountRouter": "0xDF26e5569bCf8FA088b5260453b8ca63c6215CE0",
        "merkleTreeHook": "0x73FbD25c3e817DC4B4Cd9d00eff6D83dcde2DfF6",
        "protocolFee": "0xF8F3629e308b4758F8396606405989F8D8C9c578",
        "testRecipient": "0x36FdA966CfffF8a9Cdc814f546db0e6378bFef35",
        "proxyAdmin": "0x7e32223424AB21096D81cBA5CDBBAaB30c386c1c",
        # ISM factories
        "domainRoutingIsmFactory": "0x3D72F29e5344D3605F5C139720d637a562aDd61E",
        "staticAggregationHookFactory": "0xc864fa3b661613A6b5f35243B3956eF19C7957Ab",
        "staticAggregationIsmFactory": "0xB6e12465d38C8ab160b8F05DCcD6D20624D68738",
        "staticMerkleRootMultisigIsmFactory": "0x2f2aFaE1139Ce54feFC03593FeE8AB2aDF4a85A7",
        "staticMessageIdMultisigIsmFactory": "0xfcB33440e38f6e9135B60995A1a279EE4B11F087",
    },
    "bsc": {
        "chainId": 56,
        "domainId": 56,
        "mailbox": "0x2971b9Aec44bE4eb673DF1B88cDB57b96eefe8a4",
        "validatorAnnounce": "0x69CEc33dB0A8E1D11FB00BB6a8088cd104bA5779",
        "interchainGasPaymaster": "0x78E25e7f84416e69b9339B0A6336EB6EFfF6b451",
        "interchainSecurityModule": "0xA1dD8Ae24ACd032A12cAAD2d189D36951dB26E79",
        "interchainAccountRouter": "0x2EaE5a844D4F7fdF90221fF29DB479dFF1e3E8E8",
        "merkleTreeHook": "0xFDb9Cd5f9daAA2E4474019405A328a88E7484f26",
        "protocolFee": "0xA8Aa5f14a5463a78E45CC068F11c867949F3E367",
        "testRecipient": "0x36FdA966CfffF8a9Cdc814f546db0e6378bFef35",
        "proxyAdmin": "0xc1384C6E717aDcB1A15eA0AAE7A11505B9C6Fd17",
        # ISM factories
        "domainRoutingIsmFactory": "0xaf9694877516C7dB5aF09ADaa0e4F0dF0fBE73dB",
        "staticAggregationHookFactory": "0xCa3B54BA3f3AA73816192deBbBaEE0F5069C5135",
        "staticAggregationIsmFactory": "0xeF77E66776BFc63313d0ab29d2D43234Cf0FAa35",
        "staticMerkleRootMultisigIsmFactory": "0x7bCb23C32E9C770F51149990D599696EEa37f5cB",
        "staticMessageIdMultisigIsmFactory": "0xf3c1a884c2DC609220919018a0bF99BE656E3086",
    },
    "avalanche": {
        "chainId": 43114,
        "domainId": 43114,
        "mailbox": "0xFf06aFcaABaDDd1fb08371f9ccA15D73D51FeBD6",
        "validatorAnnounce": "0xAC13f5Cf3B282f19435c90A5Ce063A90c2C9DA06",
        "interchainGasPaymaster": "0x95519ba800BBd0d34eeAE026fEc620AD978176C0",
        "interchainSecurityModule": "0x2FCEb41a5A92E3022AdB887E82e1F19Bb3eF3ec3",
        "interchainAccountRouter": "0xA7E0c7D9dDE38E1d69Ee9d78B6E6BcaC4e91F742",
        "merkleTreeHook": "0x84eea61D679F42D92145fA052C89900CBAccE95A",
        "protocolFee": "0xEc4AdA26E51f2685279F37C8aE62BeAd8212D597",
        "testRecipient": "0x36FdA966CfffF8a9Cdc814f546db0e6378bFef35",
        "proxyAdmin": "0x33dB966328Ea213b0f76eF96CA368AB37779F065",
        # ISM factories
        "domainRoutingIsmFactory": "0xfA87EB77E6b6Bc86aB436D805112C12CC1D2cE7D",
        "staticAggregationHookFactory": "0x6D4DFb0208F08B47F281636309207d2730f42FD9",
        "staticAggregationIsmFactory": "0xCa3B54BA3f3AA73816192deBbBaEE0F5069C5135",
        "staticMerkleRootMultisigIsmFactory": "0x9d0261d916C10C43Ba0aE7f1a890F614288b7F94",
        "staticMessageIdMultisigIsmFactory": "0x96A089b8Fa4243131d5CEb633fB2c19E47d948C5",
    },
}

# ============================================================================
# TESTNET CONTRACT ADDRESSES
# ============================================================================

TESTNET_ADDRESSES = {
    "sepolia": {
        "chainId": 11155111,
        "domainId": 11155111,
        "mailbox": "0xfFAEF09B3cd11D9b20d1a19bECca54EEC2884766",
        "validatorAnnounce": "0x3Fc742696D5dc9846e04f7A1823D92cb51695f9a",
        "interchainGasPaymaster": "0x6f2756380FD49228ae25Aa7F2817993cB74Ecc56",
        "interchainSecurityModule": "0x0b1C3A96E2092F24c5E09FFB76C89B01eE49b9dE",
        "interchainAccountRouter": "0x72F87F68e8FaA6fD8681784436E8D0D3e59Ed423",
        "merkleTreeHook": "0x4917a9746A7B6E0A57159cCb7F5a6744247f2d0d",
        "protocolFee": "0xb3F06fEABcd10c93A4A7fa9C55DC96F7979E2c0F",
        "testRecipient": "0x36FdA966CfffF8a9Cdc814f546db0e6378bFef35",
    },
    "arbitrumsepolia": {
        "chainId": 421614,
        "domainId": 421614,
        "mailbox": "0x598facE78a4302f11E3de0bee1894Da0b2Cb71F8",
        "validatorAnnounce": "0x01812240E27c76D343d8b7765F4a2D6b7D0093A3",
        "interchainGasPaymaster": "0x3b6044acd6767f017e99318AA6Ef93b7B06A5a22",
        "interchainSecurityModule": "0xB41CBE8f985CEb59beD965eF965704b830dFe181",
        "interchainAccountRouter": "0xeb08d61486Ff55b836CDE74b1F832c63E7636E68",
        "merkleTreeHook": "0x7f3fB83dFb15615e3301d0fE744A14cD28FA9E4a",
        "protocolFee": "0x96C0C3C12947b332b6C82c912BECA86dAF47a307",
        "testRecipient": "0x36FdA966CfffF8a9Cdc814f546db0e6378bFef35",
    },
    "optimismsepolia": {
        "chainId": 11155420,
        "domainId": 11155420,
        "mailbox": "0x6966b0E55883d49BFB24539356a2f8A673E02039",
        "validatorAnnounce": "0x6a1F49E35771cA1a706cc1BDdE59c06e96E61aDd",
        "interchainGasPaymaster": "0xD8A76C4D91fCbB7Cc8eA795DFDF870E48368995C",
        "interchainSecurityModule": "0xD756b6e0ceDc47507cb652033F088c0E890b89Ee",
        "interchainAccountRouter": "0xBd87bCD4EdE79A9DA922C7042De9b2eE7Af56A52",
        "merkleTreeHook": "0xEf4e9194Acb953AE393a18033EF098486a4dD307",
        "protocolFee": "0xf3dFed3f797B893971aB0500dCcE250c9B6E4f87",
        "testRecipient": "0x36FdA966CfffF8a9Cdc814f546db0e6378bFef35",
    },
    "basesepolia": {
        "chainId": 84532,
        "domainId": 84532,
        "mailbox": "0x6c13643B3927C57DB92c790E4E3E7Ee81e13f78C",
        "validatorAnnounce": "0x01812240E27c76D343d8b7765F4a2D6b7D0093A3",
        "interchainGasPaymaster": "0x9eaB2d13F7B49dc36675a2409E985639b07B3352",
        "interchainSecurityModule": "0x528C5598681Fa9889B17c391fCA59FeA2e19095b",
        "interchainAccountRouter": "0x70F27d88034F4a587e59445Ed67A4997Fa5e9393",
        "merkleTreeHook": "0x783eC7F7034dCaF0Ea664c80AE56CA005aa00Fb3",
        "protocolFee": "0xeD3e444a30C5b621Ea4d24dC7e3d82581521f892",
        "testRecipient": "0x36FdA966CfffF8a9Cdc814f546db0e6378bFef35",
    },
}

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_mainnet_addresses(chain_name):
    """
    Get official mainnet contract addresses for a chain

    Args:
        chain_name: Name of the chain (e.g., "ethereum", "arbitrum", "optimism")

    Returns:
        Dictionary of contract addresses or None if chain not found
    """
    return MAINNET_ADDRESSES.get(chain_name.lower(), None)

def get_testnet_addresses(chain_name):
    """
    Get official testnet contract addresses for a chain

    Args:
        chain_name: Name of the testnet chain (e.g., "sepolia", "arbitrumsepolia")

    Returns:
        Dictionary of contract addresses or None if chain not found
    """
    return TESTNET_ADDRESSES.get(chain_name.lower(), None)

def get_addresses_by_chain_id(chain_id):
    """
    Get contract addresses by chain ID

    Args:
        chain_id: The chain ID number

    Returns:
        Dictionary of contract addresses or None if chain not found
    """
    # Check mainnet addresses
    for chain_name, addresses in MAINNET_ADDRESSES.items():
        if addresses.get("chainId") == chain_id:
            return addresses

    # Check testnet addresses
    for chain_name, addresses in TESTNET_ADDRESSES.items():
        if addresses.get("chainId") == chain_id:
            return addresses

    return None

def is_known_chain(chain_name_or_id):
    """
    Check if a chain is known (has official Hyperlane contracts)

    Args:
        chain_name_or_id: Chain name or chain ID

    Returns:
        Boolean indicating if chain is known
    """
    if type(chain_name_or_id) == "string":
        return get_mainnet_addresses(chain_name_or_id) != None or get_testnet_addresses(chain_name_or_id) != None
    else:
        return get_addresses_by_chain_id(chain_name_or_id) != None

def get_all_known_chains():
    """
    Get list of all known chain names

    Returns:
        List of chain names with official Hyperlane deployments
    """
    mainnet_chains = list(MAINNET_ADDRESSES.keys())
    testnet_chains = list(TESTNET_ADDRESSES.keys())
    return mainnet_chains + testnet_chains