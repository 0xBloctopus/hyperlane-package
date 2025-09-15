# ISM (Interchain Security Module) Configuration - Enhanced

## Overview

The Interchain Security Module (ISM) is a critical component of Hyperlane that determines how messages are verified between chains. This enhanced implementation allows users to configure ISM types directly from the frontend dashboard, with full support for all 7 ISM types.

## Implementation Details

### Frontend Configuration

The ISM configuration UI is located in the Hyperlane network creation form and includes:

1. **ISM Type Selector**: Dropdown menu to select from 7 ISM types
2. **Dynamic Configuration Forms**: Type-specific configuration fields that appear based on the selected ISM type
3. **Validation**: Real-time validation of parameters (e.g., threshold ≤ validator count)
4. **Default Values**: Sensible defaults with `messageIdMultisig` as the recommended default

### Backend API

The backend now includes comprehensive ISM support:

#### API Types (`network-service/internal/api/types.go`)
```go
type HyperlaneGlobalSpec struct {
    RegistryMode  string
    AgentImageTag string
    CLIVersion    string
    ISM           *HyperlaneISMSpec  // NEW: ISM configuration
}

type HyperlaneISMSpec struct {
    Type       string                      // ISM type
    Validators []string                    // Validator addresses for multisig ISMs
    Threshold  int                         // Threshold for multisig ISMs
    Relayer    string                      // Relayer address for trustedRelayer ISM
    Owner      string                      // Owner address for pausable ISM
    Pauser     string                      // Pauser address for pausable ISM
    Modules    []HyperlaneISMSpec          // Sub-modules for aggregation ISM
    Domains    map[string]HyperlaneISMSpec // Domain-specific ISMs for routing ISM
}
```

#### Package Types (`network-service/internal/blockchain/packages/hyperlane/types.go`)
```go
type GlobalParams struct {
    RegistryMode  string     `json:"registry_mode"`
    AgentImageTag string     `json:"agent_image_tag,omitempty"`
    CLIVersion    string     `json:"cli_version,omitempty"`
    ISM           *ISMParams `json:"ism,omitempty"`  // NEW: ISM parameters
}

type ISMParams struct {
    Type       string               `json:"type"`
    Validators []string             `json:"validators,omitempty"`
    Threshold  int                  `json:"threshold,omitempty"`
    Relayer    string               `json:"relayer,omitempty"`
    Owner      string               `json:"owner,omitempty"`
    Pauser     string               `json:"pauser,omitempty"`
    Modules    []ISMParams          `json:"modules,omitempty"`
    Domains    map[string]ISMParams `json:"domains,omitempty"`
}
```

#### Parameter Mapping (`network-service/internal/blockchain/mapping/hyperlane_params.go`)
The `mapISMConfig` function maps API ISM specifications to Hyperlane package parameters, including recursive mapping for aggregation and routing ISMs.

## Supported ISM Types

### 1. Trusted Relayer ISM (`trustedRelayer`)
- **Security**: Low - Single point of trust
- **Speed**: Fast - No consensus required
- **Configuration**:
  - `relayer`: Address of the trusted relayer (defaults to deployer)
- **Use Case**: Development, testing, or trusted environments

### 2. Multisig ISM (`multisig`)
- **Security**: Medium - Requires M-of-N signatures
- **Speed**: Medium - Waits for multiple signatures
- **Configuration**:
  - `validators`: Array of validator addresses
  - `threshold`: Number of required signatures
- **Use Case**: Standard production deployments

### 3. Message ID Multisig ISM (`messageIdMultisig`) - RECOMMENDED
- **Security**: High - Enhanced multisig with message ID verification
- **Speed**: Medium - Similar to standard multisig
- **Configuration**:
  - `validators`: Array of validator addresses
  - `threshold`: Number of required signatures
- **Use Case**: Production deployments requiring additional security
- **Default**: This is the recommended and default ISM type

### 4. Merkle Root Multisig ISM (`merkleRootMultisig`)
- **Security**: High - Uses merkle proof verification
- **Speed**: Slower - Requires merkle tree computation
- **Configuration**:
  - `validators`: Array of validator addresses
  - `threshold`: Number of required signatures
- **Use Case**: High-security environments with batched messages

### 5. Aggregation ISM (`aggregation`)
- **Security**: Configurable - Combines multiple ISMs
- **Speed**: Variable - Depends on sub-ISMs
- **Configuration**:
  - `modules`: Array of sub-ISM configurations
  - `threshold`: Number of sub-ISMs that must verify
- **Use Case**: Complex security requirements
- **Note**: Advanced configuration - UI support coming soon

### 6. Routing ISM (`routing`)
- **Security**: Variable - Different ISMs per origin domain
- **Speed**: Variable - Depends on domain-specific ISMs
- **Configuration**:
  - `domains`: Map of domain IDs to ISM configurations
- **Use Case**: Multi-domain deployments with varying security needs
- **Note**: Advanced configuration - UI support coming soon

### 7. Pausable ISM (`pausable`)
- **Security**: Variable - Can pause message verification
- **Speed**: Fast when not paused
- **Configuration**:
  - `owner`: Address that can transfer ownership
  - `pauser`: Address that can pause/unpause (defaults to owner)
- **Use Case**: Emergency stop mechanisms

## Configuration Flow

1. **User Selection**: User selects ISM type in the frontend dashboard
2. **Dynamic Form**: Type-specific configuration fields appear
3. **Validation**: Frontend validates parameters (e.g., valid addresses, threshold constraints)
4. **API Submission**: Configuration sent to backend with network creation request
5. **Parameter Mapping**: Backend maps API types to Hyperlane package parameters
6. **Deployment**: Hyperlane package deploys contracts with specified ISM configuration

## Example Configurations

### Message ID Multisig (Recommended)
```json
{
  "type": "messageIdMultisig",
  "validators": [
    "0x1234567890123456789012345678901234567890",
    "0x2345678901234567890123456789012345678901",
    "0x3456789012345678901234567890123456789012"
  ],
  "threshold": 2
}
```

### Trusted Relayer (Development)
```json
{
  "type": "trustedRelayer",
  "relayer": "0x1234567890123456789012345678901234567890"
}
```

### Pausable ISM
```json
{
  "type": "pausable",
  "owner": "0x1234567890123456789012345678901234567890",
  "pauser": "0x2345678901234567890123456789012345678901"
}
```

## Auto-Generation Features

### Validator Auto-Generation
If no validators are specified for multisig ISMs:
1. System auto-generates validators based on configured chains
2. Uses deployer keys for each chain as validators
3. Sets threshold to majority (⌈n/2⌉)

### Default Addresses
- If relayer not specified: Uses deployer address
- If owner not specified: Uses deployer address
- If pauser not specified: Uses owner address

## Validation Rules

1. **Threshold Validation**: Threshold must be ≤ validator count and ≥ 1
2. **Address Validation**: All addresses must be valid Ethereum addresses (0x + 40 hex chars)
3. **ISM Type Validation**: Must be one of the 7 supported types
4. **Empty Validator Filtering**: Empty validator entries are automatically filtered out

## Security Considerations

1. **Production Recommendations**:
   - Use `messageIdMultisig` for production deployments
   - Set threshold to at least ⌈n/2⌉ for majority consensus
   - Use distinct validator keys (not deployer keys)
   - Store validator keys securely

2. **Development Recommendations**:
   - `trustedRelayer` is acceptable for development
   - Can use single validator with threshold of 1 for testing

3. **Key Management**:
   - Never expose validator private keys
   - Use hardware wallets or secure key management systems for production
   - Rotate keys periodically

## Troubleshooting

### Common Issues

1. **"ISM threshold exceeds validator count"**
   - Solution: Reduce threshold or add more validators
   - System auto-adjusts if detected

2. **"No ISM configuration provided"**
   - Solution: Defaults to trusted relayer with deployer as relayer
   - Recommendation: Explicitly configure ISM for production

3. **"Invalid validator address"**
   - Solution: Ensure all addresses are valid Ethereum addresses
   - Check for typos or missing characters

## Future Enhancements

1. **Aggregation ISM UI**: Visual builder for combining multiple ISMs
2. **Routing ISM UI**: Domain-specific ISM configuration interface
3. **ISM Templates**: Pre-configured security profiles (e.g., "High Security", "Fast & Trusted")
4. **ISM Migration**: Tools to upgrade ISM configuration post-deployment
5. **ISM Analytics**: Dashboard showing validator participation and message verification stats

## Migration Guide

### From Default (Trusted Relayer) to Message ID Multisig

1. Identify current relayer address
2. Generate or identify validator addresses (minimum 3 recommended)
3. Update configuration:
   ```json
   {
     "type": "messageIdMultisig",
     "validators": ["0x...", "0x...", "0x..."],
     "threshold": 2
   }
   ```
4. Deploy new configuration
5. Update validator nodes with signing keys
6. Test message passing between chains

## API Reference

### Frontend Form Fields

- `networks[i].params.global.ism.type`: ISM type selection
- `networks[i].params.global.ism.validators[]`: Validator addresses array
- `networks[i].params.global.ism.threshold`: Signature threshold
- `networks[i].params.global.ism.relayer`: Relayer address
- `networks[i].params.global.ism.owner`: Owner address
- `networks[i].params.global.ism.pauser`: Pauser address

### Backend API Payload

```typescript
{
  global: {
    registryMode: 'local',
    ism: {
      type: 'messageIdMultisig',
      validators: ['0x...', '0x...'],
      threshold: 2
    }
  }
}
```

## Testing

### Unit Tests
- Validate ISM configuration mapping
- Test threshold validation logic
- Verify address validation

### Integration Tests
- Test each ISM type deployment
- Verify message passing with different ISMs
- Test ISM parameter updates

### End-to-End Tests
1. Create network with specific ISM
2. Deploy contracts
3. Send test message
4. Verify message with configured ISM
5. Confirm successful delivery

## Support

For issues or questions about ISM configuration:
1. Check the troubleshooting section above
2. Review Hyperlane documentation: https://docs.hyperlane.xyz
3. Contact support with:
   - ISM type being used
   - Configuration parameters
   - Error messages
   - Network logs