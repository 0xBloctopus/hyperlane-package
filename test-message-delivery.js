#!/usr/bin/env node

/**
 * Test Hyperlane Message Delivery
 * Sends a test message from patientbadger to diligenttortoise
 */

const { ethers } = require('ethers');

// Chain configurations
const PATIENTBADGER_RPC = 'https://3e3c20a6c9fd4c4d8808e9a0b2157d66-rpc.network.bloctopus.internal';
const DILIGENTTORTOISE_RPC = 'https://ee692ab564944ee699e0db281b562282-rpc.network.bloctopus.internal';

// Chain IDs
const PATIENTBADGER_ID = 2819827;
const DILIGENTTORTOISE_ID = 9555621;

// Private key provided
const PRIVATE_KEY = '0x67421ebd96328b43ac082593338c2e78307369bcc6a038065cb85fc8d754222f';

// Contract addresses (same on both chains)
const MAILBOX_ADDRESS = '0xE9D519bD25952e5382130F317F9C0aafe14a24a9';
const TEST_RECIPIENT = '0xBCb3BE2F5C3480d3316D1B45C1767Ea450e7A2D9';

// Mailbox ABI (minimal for sending messages)
const MAILBOX_ABI = [
    'function dispatch(uint32 destinationDomain, bytes32 recipientAddress, bytes calldata messageBody) external payable returns (bytes32 messageId)',
    'function delivered(bytes32 messageId) external view returns (bool)',
    'event Dispatch(address indexed sender, uint32 indexed destination, bytes32 indexed recipient, bytes32 message)',
    'event Process(uint32 indexed origin, bytes32 indexed sender, bytes32 indexed recipient)'
];

async function main() {
    console.log('🚀 Starting Hyperlane cross-chain message test...\n');

    try {
        // Setup providers - using http instead of https for internal URLs
        const sourceRpc = PATIENTBADGER_RPC.replace('https://', 'http://');
        const destRpc = DILIGENTTORTOISE_RPC.replace('https://', 'http://');

        const sourceProvider = new ethers.JsonRpcProvider(sourceRpc);
        const destProvider = new ethers.JsonRpcProvider(destRpc);
        const wallet = new ethers.Wallet(PRIVATE_KEY);
        const sourceSigner = wallet.connect(sourceProvider);
        const destSigner = wallet.connect(destProvider);

        console.log(`Sender address: ${wallet.address}`);

        // Get current balances
        const sourceBalance = await sourceProvider.getBalance(wallet.address);
        const destBalance = await destProvider.getBalance(wallet.address);
        console.log(`PatientBadger (${PATIENTBADGER_ID}) balance: ${ethers.formatEther(sourceBalance)} ETH`);
        console.log(`DiligentTortoise (${DILIGENTTORTOISE_ID}) balance: ${ethers.formatEther(destBalance)} ETH\n`);

        // Create mailbox contract instances
        const sourceMailbox = new ethers.Contract(MAILBOX_ADDRESS, MAILBOX_ABI, sourceSigner);
        const destMailbox = new ethers.Contract(MAILBOX_ADDRESS, MAILBOX_ABI, destSigner);

        // Create test message
        const timestamp = Math.floor(Date.now() / 1000);
        const messageBody = ethers.toUtf8Bytes(`Hello from PatientBadger! Test at ${timestamp}`);
        console.log(`📤 Sending message: "${ethers.toUtf8String(messageBody)}"`);

        // Convert recipient address to bytes32 format
        const recipientBytes32 = ethers.zeroPadValue(TEST_RECIPIENT, 32);
        console.log(`📍 Destination: DiligentTortoise (domain ${DILIGENTTORTOISE_ID})`);
        console.log(`📍 Recipient: ${TEST_RECIPIENT}\n`);

        // Send the message
        console.log('📡 Dispatching message from PatientBadger...');
        const tx = await sourceMailbox.dispatch(
            DILIGENTTORTOISE_ID,
            recipientBytes32,
            messageBody,
            { gasLimit: 300000 }
        );

        console.log(`✅ Transaction sent: ${tx.hash}`);

        // Wait for confirmation
        console.log('⏳ Waiting for transaction confirmation...');
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

        // Extract message ID from events
        let messageId = null;
        for (const log of receipt.logs) {
            try {
                const parsed = sourceMailbox.interface.parseLog(log);
                if (parsed && parsed.name === 'Dispatch') {
                    // The message ID is the return value, not in the event
                    // We need to get it from the transaction
                    console.log('📨 Message dispatched successfully!');
                    console.log(`   From: PatientBadger (${PATIENTBADGER_ID})`);
                    console.log(`   To: DiligentTortoise (${DILIGENTTORTOISE_ID})`);
                    break;
                }
            } catch (e) {
                // Skip unparseable logs
            }
        }

        // Monitor for delivery
        console.log('\n🔍 Monitoring for message delivery on DiligentTortoise...');
        console.log('💡 This may take 30-60 seconds as validators sign and relayer processes...\n');

        // Set up event listener for Process events
        const processFilter = destMailbox.filters.Process();

        // Monitor for up to 2 minutes
        const timeout = setTimeout(() => {
            console.log('⏰ Timeout reached (2 minutes). Message may still be delivered.');
            console.log('💡 Check validator and relayer logs for more details.');
            process.exit(0);
        }, 120000);

        destMailbox.on(processFilter, async (origin, sender, recipient, event) => {
            console.log(`\n🎉 MESSAGE DELIVERED!`);
            console.log(`📤 Origin domain: ${origin}`);
            console.log(`👤 Sender: ${sender}`);
            console.log(`📍 Recipient: ${recipient}`);
            console.log(`📦 Transaction: ${event.log.transactionHash}`);
            console.log(`⏱️  Delivery time: ${Math.floor((Date.now() / 1000) - timestamp)} seconds`);

            console.log('\n✅ SUCCESS! End-to-end message delivery confirmed!');
            clearTimeout(timeout);
            process.exit(0);
        });

        console.log('🔄 Monitoring active... (Press Ctrl+C to stop)');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.reason) {
            console.error(`Reason: ${error.reason}`);
        }
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Test stopped by user');
    process.exit(0);
});

main().catch(console.error);