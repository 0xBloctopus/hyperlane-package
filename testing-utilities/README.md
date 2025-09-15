# Hyperlane Testing Utilities

This directory contains various testing and verification scripts used during the development and validation of the Hyperlane cross-chain messaging deployment.

## Message Delivery Verification Scripts

### Core Verification Tools
- **`verify-delivery.js`** - Verify message delivery using deployment addresses
- **`verify-complete-delivery.js`** - Complete message delivery verification with destination chain proof
- **`test-zero-range-delivery.js`** - Test message delivery with zero-range sync deployment
- **`test-new-deployment.js`** - Test message delivery with fresh deployment addresses

### Message Sending Utilities
- **`send-test-message.js`** - Send test cross-chain messages
- **`send-via-mailbox.js`** - Send messages directly via Hyperlane Mailbox
- **`send-and-prove-delivery.js`** - Send message and prove delivery end-to-end

### Transaction Analysis Tools
- **`debug-transaction.js`** - Debug transaction details and logs
- **`debug-latest-tx.js`** - Debug most recent transaction
- **`exhaustive-tx-search.js`** - Comprehensive transaction search across chains
- **`find-delivery-tx.js`** - Find delivery transaction on destination chain
- **`find-dst-tx-hash.js`** - Find destination transaction hash
- **`extract-message-manually.js`** - Manually extract message from transaction logs

### Delivery Status Monitoring
- **`check-delivery-status.js`** - Check if message has been delivered
- **`check-message-id.js`** - Check message ID status
- **`continuous-monitor.js`** - Continuously monitor message delivery
- **`search-process-events.js`** - Search for Process events on destination chain

### Delivery Proof Tools
- **`find-delivery-proof.js`** - Find proof of message delivery
- **`complete-delivery-proof.js`** - Generate complete delivery proof
- **`prove-delivery-with-agents.js`** - Prove delivery using active agents
- **`final-delivery-proof.js`** - Final comprehensive delivery proof

### Quick Testing Tools
- **`quick-test-message.js`** - Quick message test
- **`quick-delivery-check.js`** - Quick delivery status check
- **`test-message.js`** - Basic message testing

### Legacy Scripts
- **`test-multisig-message.sh`** - Shell script for multisig message testing and verification

## Usage

Most scripts can be run directly with Node.js:

```bash
cd testing-utilities
node verify-delivery.js
node send-test-message.js
node continuous-monitor.js
```

## Configuration

These scripts use hardcoded deployment addresses and RPC endpoints for testing purposes. Update the constants at the top of each script as needed for your specific deployment.

## Purpose

These utilities were created to:
- Validate cross-chain message delivery functionality
- Debug deployment issues
- Monitor agent performance
- Verify zero-range sync optimizations
- Prove end-to-end delivery with blockchain evidence

## Note

These are development and testing utilities. They contain test private keys and should not be used in production environments.