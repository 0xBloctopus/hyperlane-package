# Configuration Templates

This directory contains configuration templates for Hyperlane package deployments. These files serve as argument templates for Kurtosis deployments.

## Usage

Use these configuration files with the Kurtosis run command:

```bash
kurtosis run . --args-file config-examples/multisig-config.json
```

## Available Templates

- **multisig-config.json** – baseline deployment using the default `messageIdMultisigIsm`
- **existing-contracts-config.json** – reuse previously deployed Mailboxes/Announcers
- **custom-chains-config.json** – demo of custom chain names & registry generation
- **routing-ism-config.json** – per-domain security via the routing ISM
- **aggregation-ism-config.json** – combine multiple ISMs behind a threshold
- **test_sepolia_s3.json** – ready-to-run S3 checkpoint scenario (used in docs)

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
