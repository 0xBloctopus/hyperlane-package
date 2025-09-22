#!/usr/bin/env node
// Announce validator storage location via ValidatorAnnounce contract
// Usage env:
//  RPC_URL: chain RPC endpoint
//  VALIDATOR_KEY: hex private key (0x...)
//  AGENT_CONFIG: path to agent-config.json (default /configs/agent-config.json)
//  ORIGIN_CHAIN: chain key in agent-config.json (e.g., 'sepolia')
//  STORAGE: storage location string (e.g., s3://bucket/region/folder)

const fs = require('fs');
const { ethers } = require('ethers');

async function main() {
  const rpc = process.env.RPC_URL;
  const validatorKey = process.env.VALIDATOR_KEY;
  const chainSignerKey = process.env.CHAIN_SIGNER_KEY;
  const origin = process.env.ORIGIN_CHAIN;
  const storage = process.env.STORAGE;
  const configPath = process.env.AGENT_CONFIG || '/configs/agent-config.json';

  if (!rpc || !validatorKey || !origin || !storage) {
    console.error('Missing env: RPC_URL, VALIDATOR_KEY, ORIGIN_CHAIN, STORAGE');
    process.exit(1);
  }

  const j = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const chainCfg = j.chains[origin];
  if (!chainCfg) {
    throw new Error(`Origin chain ${origin} not found in agent-config.json`);
  }
  const ann = chainCfg.validatorAnnounce;
  if (!ann) throw new Error('validatorAnnounce address missing');

  const provider = new ethers.JsonRpcProvider(rpc);
  const validatorWallet = new ethers.Wallet(validatorKey);
  const announceWallet = chainSignerKey
    ? new ethers.Wallet(chainSignerKey, provider)
    : new ethers.Wallet(validatorKey, provider);

  // ABI fragments needed
  const abi = [
    'function getAnnouncementDigest(string _storageLocation) public view returns (bytes32)',
    'function announce(address _validator, string _storageLocation, bytes _signature) external returns (bool)'
  ];
  const contract = new ethers.Contract(ann, abi, announceWallet);

  const digest = await contract.getAnnouncementDigest(storage);
  const signature = ethers.Signature.from(validatorWallet.signingKey.sign(digest)).serialized;

  const validatorAddress = await validatorWallet.getAddress();
  const tx = await contract.announce(validatorAddress, storage, signature);
  const rcpt = await tx.wait();
  console.log('Announce tx hash:', rcpt.hash, 'status:', rcpt.status);
}

main().catch((e) => { console.error(e); process.exit(1); });
