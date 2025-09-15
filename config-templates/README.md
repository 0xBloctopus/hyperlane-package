# Configuration Templates

This directory contains configuration templates for Hyperlane package deployments. These files serve as argument templates for Kurtosis deployments.

## Usage

Use these configuration files with the Kurtosis run command:

```bash
kurtosis run . --args-file config-templates/multisig-config.json
```

## Available Templates

- **multisig-config.json** - Basic multisig ISM configuration
- **existing-contracts-config.json** - Configuration for using existing deployed contracts
- **custom-chains-config.json** - Custom chain names with enhanced validation
- **ism-types-config.json** - Different ISM types demonstration 
- **routing-ism-config.json** - Routing ISM with per-domain security models
- **aggregation-ism-config.json** - Aggregation ISM with multiple security modules
- **custom-chains-config.yaml** - YAML version of custom chains configuration

## Template Structure

Each configuration file includes:

- **chains**: Array of blockchain configurations
- **agents**: Deployer, relayer, and validator configurations
- **global**: Global settings including ISM configuration and image versions

## ISM Types Supported

- `multisig` - Multi-signature validation
- `messageIdMultisigIsm` - Message ID-based multisig
- `trustedRelayer` - Trusted relayer validation
- `routing` - Domain-specific routing ISM
- `aggregation` - Multiple ISM aggregation
- `merkleRoot` - Merkle root validation
- `pausable` - Pausable ISM wrapper

## Custom Chain Names

The package supports custom chain names with automatic normalization and validation. See `custom-chains-config.json` for examples.