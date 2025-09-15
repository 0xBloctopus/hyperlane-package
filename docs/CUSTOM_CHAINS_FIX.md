# Custom Chains Registration Fix

## Problem
The Hyperlane deployment was failing with the error "No chain metadata set for [chain-name]" when using custom/randomly generated chain names like "cheerful-owl" or "ambitious-porcupine".

## Root Causes
1. **Timing Issue**: Chain metadata was being created AFTER Hyperlane CLI commands tried to use it
2. **Registry Not Initialized**: The Hyperlane CLI couldn't find custom chains because they weren't properly registered
3. **Outdated CLI**: Using Hyperlane CLI v16.2.0 which had compatibility issues
4. **Command Syntax**: Older command syntax not compatible with newer features

## Solution Implemented

### 1. Registry Pre-initialization
Added `initialize_chain_registry()` function that:
- Creates metadata for ALL chains BEFORE any CLI commands
- Generates a `chains.yaml` file with all chain configurations
- Sets up proper registry directory structure
- Exports environment variables for Hyperlane CLI

### 2. Updated CLI Version
- Updated from v16.2.0 to v18.2.0 for better custom chain support
- Updated Docker image tag to v1.0.29

### 3. Fixed Command Syntax
Updated Hyperlane CLI commands to use v18+ syntax:
- `hyperlane core init --yes --out [file] --registry [dir]`
- `hyperlane core deploy --chain [name] --config [file] --registry [dir] --key [key] --yes`

### 4. Environment Variables
Added critical environment variables:
- `HYP_REGISTRY`: Points to registry directory
- `HYP_CHAINS_FILE`: Points to chains.yaml configuration

## Files Modified

1. **`src/deployments/hyperlane-deployer/deployment-scripts/deploy_core.sh`**
   - Added `initialize_chain_registry()` function
   - Added `create_chains_config_file()` function
   - Moved metadata creation before CLI usage
   - Updated CLI command syntax

2. **`src/deployments/hyperlane-deployer/Dockerfile`**
   - Updated CLI_VERSION from 16.2.0 to 18.2.0

3. **`modules/config/constants.star`**
   - Updated HYPERLANE_CLI_IMAGE to v1.0.29

4. **`modules/infrastructure/cli.star`**
   - Added HYP_REGISTRY and HYP_CHAINS_FILE environment variables

## How It Works Now

1. **Initialization Phase**:
   - Registry directory structure is created
   - Metadata files are generated for ALL chains
   - chains.yaml configuration file is created
   - Environment variables are exported

2. **Deployment Phase**:
   - Hyperlane CLI can now recognize custom chains
   - Uses local registry for chain metadata
   - Deploys contracts successfully

## Testing

To verify the fix works:

1. Deploy a Hyperlane network with custom chain names
2. Check that `/configs/registry/chains/[chain-name]/metadata.yaml` exists
3. Verify `/configs/registry/chains.yaml` contains all chains
4. Confirm deployment completes without "No chain metadata" errors

## Troubleshooting

If issues persist:

1. **Check Registry Structure**:
   ```bash
   ls -la /configs/registry/chains/
   cat /configs/registry/chains.yaml
   ```

2. **Verify Environment Variables**:
   ```bash
   echo $HYP_REGISTRY
   echo $HYP_CHAINS_FILE
   ```

3. **Check CLI Version**:
   ```bash
   hyperlane --version
   ```

4. **Review Logs**:
   - Look for "Initializing chain registry" message
   - Check for "Registered chain metadata for [chain]" messages
   - Verify no "No chain metadata set" errors

## Future Improvements

1. Consider using standardized chain names instead of random generation
2. Add chain metadata validation before deployment
3. Implement better error handling for registry initialization
4. Add support for chain metadata updates during runtime