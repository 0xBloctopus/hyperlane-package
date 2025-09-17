#!/usr/bin/env node
/**
 * Agent Config Generator
 * Generates agent configuration for Hyperlane validators and relayers
 * based on deployed contract addresses and chain configurations
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const YAML = require('yaml');

// ============================================================================
// CONSTANTS
// ============================================================================

const REGISTRY_BASE_URL = 'https://raw.githubusercontent.com/hyperlane-xyz/hyperlane-registry/main/chains';
const CONFIGS_DIR = '/configs';
const REGISTRY_DIR = '/configs/registry/chains';
const DEFAULT_TIMEOUT = 5000;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Logger utility with different log levels
 */
const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  debug: (msg) => process.env.DEBUG && console.log(`[DEBUG] ${msg}`),
};

/**
 * Safely read and parse a file
 */
function readFile(filePath, format = 'json') {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return format === 'yaml' ? YAML.parse(content) : JSON.parse(content);
  } catch (error) {
    logger.debug(`Failed to read ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Write JSON output with proper formatting
 */
function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    logger.info(`Successfully wrote config to ${filePath}`);
  } catch (error) {
    logger.error(`Failed to write to ${filePath}: ${error.message}`);
    throw error;
  }
}

/**
 * Parse command line arguments or configuration file
 */
function parseInput(inputPath) {
  const raw = fs.readFileSync(path.resolve(inputPath), 'utf8');
  
  // Try YAML first, then JSON
  try {
    return YAML.parse(raw);
  } catch (yamlError) {
    try {
      return JSON.parse(raw);
    } catch (jsonError) {
      throw new Error('Failed to parse input as YAML or JSON');
    }
  }
}

// ============================================================================
// NETWORK OPERATIONS
// ============================================================================

/**
 * Fetch YAML configuration from a URL with timeout and error handling
 */
function fetchYaml(url) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      logger.debug(`Request to ${url} timed out`);
      resolve(null);
    }, DEFAULT_TIMEOUT);

    https
      .get(url, (res) => {
        clearTimeout(timeout);
        
        if (res.statusCode !== 200) {
          res.resume();
          logger.debug(`Request to ${url} returned status ${res.statusCode}`);
          return resolve(null);
        }
        
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(YAML.parse(data));
          } catch (error) {
            logger.debug(`Failed to parse YAML from ${url}: ${error.message}`);
            resolve(null);
          }
        });
      })
      .on('error', (error) => {
        clearTimeout(timeout);
        logger.debug(`Request to ${url} failed: ${error.message}`);
        resolve(null);
      });
  });
}

// ============================================================================
// CORE ADDRESS RESOLUTION
// ============================================================================

/**
 * Sanitize chain name to match the format used by deployment scripts
 */
function sanitizeChainName(name) {
  // Remove hyphens and underscores, convert to lowercase
  return name.toLowerCase().replace(/[-_]/g, '');
}

/**
 * Read core contract addresses from various possible locations
 */
function readCoreAddresses(chainName) {
  const addresses = {
    mailbox: '',
    validatorAnnounce: '',
    ism: '',
    merkleTreeHook: '',
  };

  // Sanitize the chain name for consistency with deployment scripts
  const sanitizedName = sanitizeChainName(chainName);

  // Try JSON format in configs directory
  const jsonPath = path.resolve(CONFIGS_DIR, `addresses-${chainName}.json`);
  const jsonData = readFile(jsonPath, 'json');

  if (jsonData) {
    addresses.mailbox = jsonData.mailbox || jsonData.Mailbox || '';
    addresses.validatorAnnounce = jsonData.validatorAnnounce || jsonData.ValidatorAnnounce || '';
    addresses.ism = jsonData.interchainSecurityModule || jsonData.defaultIsm || jsonData.ism || '';
    addresses.merkleTreeHook = jsonData.merkleTreeHook || jsonData.MerkleTreeHook || '';

    if (addresses.mailbox) {
      logger.debug(`Found addresses for ${chainName} in JSON format`);
      return addresses;
    }
  }

  // Try YAML format in registry directory with sanitized name
  const yamlPath = path.resolve(REGISTRY_DIR, sanitizedName, 'addresses.yaml');
  const yamlData = readFile(yamlPath, 'yaml');
  
  if (yamlData) {
    addresses.mailbox = yamlData.mailbox || '';
    addresses.validatorAnnounce = yamlData.validatorAnnounce || '';
    // Check for ISM in multiple possible fields
    addresses.ism = yamlData.defaultIsm || yamlData.interchainSecurityModule || yamlData.ism || '';
    addresses.merkleTreeHook = yamlData.merkleTreeHook || '';
    
    if (addresses.mailbox) {
      logger.debug(`Found addresses for ${chainName} in YAML format`);
      if (addresses.ism) {
        logger.debug(`Found ISM address for ${chainName}: ${addresses.ism}`);
      }
      if (addresses.merkleTreeHook) {
        logger.debug(`Found merkleTreeHook address for ${chainName}: ${addresses.merkleTreeHook}`);
      }
      return addresses;
    }
  }

  return addresses;
}

/**
 * Fetch addresses from public registry if enabled
 */
async function fetchPublicAddresses(chainName) {
  if (process.env.ENABLE_PUBLIC_FALLBACK !== 'true') {
    return null;
  }

  const url = `${REGISTRY_BASE_URL}/${chainName}/addresses.yaml`;
  logger.debug(`Fetching public registry for ${chainName} from ${url}`);
  
  const doc = await fetchYaml(url);
  
  if (doc && typeof doc === 'object') {
    return {
      mailbox: doc.mailbox || '',
      validatorAnnounce: doc.validatorAnnounce || '',
      ism: doc.interchainSecurityModule || '',
      merkleTreeHook: doc.merkleTreeHook || '',
    };
  }
  
  return null;
}

// ============================================================================
// BLOCK HEIGHT OPTIMIZATION
// ============================================================================

/**
 * Fetch current block height from RPC endpoint
 */
async function fetchBlockHeight(rpc) {
  try {
    const response = await fetch(rpc, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      })
    });
    
    const data = await response.json();
    
    if (data.result) {
      return parseInt(data.result, 16);
    }
    throw new Error('No result in RPC response');
  } catch (error) {
    throw new Error(`RPC call failed: ${error.message}`);
  }
}

// ============================================================================
// CONFIGURATION BUILDER
// ============================================================================

/**
 * Build configuration for a single chain
 */
async function buildChainConfig(chain) {
  // Sanitize the chain name for consistency
  const sanitizedName = sanitizeChainName(chain.name);

  const config = {
    // Add required chain metadata fields
    name: sanitizedName,
    chainId: chain.chain_id || chain.chainId || chain.chainID,  // Support chainID from frontend
    domainId: chain.chain_id || chain.chainId || chain.chainID,  // Support chainID from frontend
    protocol: 'ethereum',

    // Format RPC URLs properly for Hyperlane
    rpcUrls: [{ http: chain.rpc_url }],

    // Connection info (legacy format, kept for compatibility)
    connection: { url: chain.rpc_url },

    // Contract addresses
    mailbox: '',
    validatorAnnounce: '',
    ism: '',
    merkleTreeHook: ''
  };

  // Start with existing addresses from input - ensure they remain as strings
  const existing = chain.existing_addresses || {};
  config.mailbox = String(existing.mailbox || '');
  config.validatorAnnounce = String(existing.validatorAnnounce || '');
  config.ism = String(existing.ism || '');
  config.merkleTreeHook = String(existing.merkleTreeHook || '');

  // Override with deployed addresses if available
  const deployed = readCoreAddresses(chain.name);
  config.mailbox = deployed.mailbox || config.mailbox;
  config.validatorAnnounce = deployed.validatorAnnounce || config.validatorAnnounce;
  config.ism = deployed.ism || config.ism;
  config.merkleTreeHook = deployed.merkleTreeHook || config.merkleTreeHook;

  // Check if we need to fetch from public registry
  const needsPublic = !config.mailbox || !config.validatorAnnounce || !config.ism;
  
  if (needsPublic) {
    const publicAddresses = await fetchPublicAddresses(chain.name);
    if (publicAddresses) {
      config.mailbox = config.mailbox || publicAddresses.mailbox;
      config.validatorAnnounce = config.validatorAnnounce || publicAddresses.validatorAnnounce;
      config.ism = config.ism || publicAddresses.ism;
      config.merkleTreeHook = config.merkleTreeHook || publicAddresses.merkleTreeHook;
    }
  }

  // Log missing addresses
  if (!config.mailbox) {
    logger.error(`Missing mailbox address for ${chain.name}`);
  }

  // Add block height optimization for sync starting point
  try {
    logger.debug(`Fetching current block height for ${chain.name}`);
    const currentBlock = await fetchBlockHeight(chain.rpc_url);
    const safeStartBlock = Math.max(0, currentBlock - 100); // Start 100 blocks back for safety
    
    logger.info(`Current block for ${chain.name}: ${currentBlock}, Starting from: ${safeStartBlock}`);
    config.index = { from: safeStartBlock };
  } catch (error) {
    logger.error(`Error fetching block height for ${chain.name}: ${error.message}`);
    logger.error(`Using fallback starting block of 0 for ${chain.name}`);
    config.index = { from: 0 };
  }

  return config;
}

/**
 * Build complete agent configuration
 */
async function buildAgentConfig(args) {
  const chains = args.chains || [];
  const config = { 
    chains: {},
    defaultism: {},
    // Add validator configuration if validators are present
    validator: {},
    checkpointSyncer: {},
    // Add ISM configuration
    ism: {}
  };

  logger.info(`Building agent config for ${chains.length} chains`);

  // Process default ISM configuration if provided
  if (args.default_ism) {
    logger.info(`Processing default ISM configuration: ${JSON.stringify(args.default_ism)}`);
    config.ism = args.default_ism;
    
    // Add to defaultism for backwards compatibility
    if (args.default_ism.type && args.default_ism.validators && args.default_ism.threshold) {
      for (const chain of chains) {
        // Use sanitized chain name for consistency
        const sanitizedName = sanitizeChainName(chain.name);
        config.defaultism[sanitizedName] = {
          type: args.default_ism.type,
          validators: args.default_ism.validators,
          threshold: args.default_ism.threshold
        };
        logger.debug(`Set default ISM for ${sanitizedName}: ${JSON.stringify(config.defaultism[sanitizedName])}`);
      }
    }
  }

  // Process each chain
  for (const chain of chains) {
    logger.debug(`Processing chain: ${chain.name}`);
    const chainConfig = await buildChainConfig(chain);
    // Use sanitized name as the key in the config
    const sanitizedName = sanitizeChainName(chain.name);
    config.chains[sanitizedName] = chainConfig;

    // Add ISM to defaultism configuration for relayer
    if (chainConfig.ism) {
      config.defaultism[sanitizedName] = chainConfig.ism;
      logger.debug(`Added ISM for ${sanitizedName} to defaultism config: ${chainConfig.ism}`);
    }
  }

  // Add validator configuration if validators are defined
  if (args.validators && args.validators.length > 0) {
    // Use the first validator's configuration as default
    const validator = args.validators[0];
    config.validator = {
      type: "hexKey",
      key: validator.signing_key || process.env.VALIDATOR_KEY || ""
    };

    // Configure checkpoint syncer
    const syncerConfig = validator.checkpoint_syncer || {};
    if (syncerConfig.type === "s3") {
      config.checkpointSyncer = {
        type: "s3",
        bucket: syncerConfig.params?.bucket || "",
        region: syncerConfig.params?.region || "",
        prefix: syncerConfig.params?.prefix || ""
      };
    } else {
      // Default to localStorage
      config.checkpointSyncer = {
        type: "localStorage",
        path: syncerConfig.params?.path || "/data/validator-checkpoints"
      };
    }

    // Set origin chain name if specified (sanitized)
    if (validator.chain) {
      config.originChainName = sanitizeChainName(validator.chain);
    }
  } else {
    // Provide minimal validator config to prevent errors
    config.validator = {
      type: "hexKey",
      key: process.env.VALIDATOR_KEY || ""
    };
    config.checkpointSyncer = {
      type: "localStorage",
      path: "/data/validator-checkpoints"
    };
  }

  return config;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const [,, inputPath, outputPath] = process.argv;

  // Validate arguments
  if (!inputPath || !outputPath) {
    console.error('Usage: agent-config-gen <input-args.(yaml|json)> <output-agent-config.json>');
    process.exit(1);
  }

  try {
    // Parse input
    logger.info(`Reading configuration from ${inputPath}`);
    const args = parseInput(inputPath);

    // Build configuration
    const config = await buildAgentConfig(args);

    // Write output
    writeJsonFile(path.resolve(outputPath), config);
    
    logger.info('Agent configuration generated successfully');
  } catch (error) {
    logger.error(`Failed to generate agent config: ${error.message}`);
    
    // Write empty config as fallback
    try {
      writeJsonFile(path.resolve(outputPath), { chains: {} });
    } catch (writeError) {
      logger.error(`Failed to write fallback config: ${writeError.message}`);
    }
    
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  logger.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});