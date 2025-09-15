#!/usr/bin/env node

/**
 * Test Message Sender - Sends a message from one chain to another and verifies delivery
 */

import { ethers } from 'ethers';

const SEPOLIA_RPC = 'https://eth-sepolia.g.alchemy.com/v2/lC2HDPB2Vs7-p-UPkgKD-VqFulU5elyk';
const BASE_SEPOLIA_RPC = 'https://base-sepolia.gateway.tenderly.co';

// Private key from config (this is a test key, not for production)
const PRIVATE_KEY = '0x1cdf65ac75f477650040ebe272ddaffb6735dcf55bd651869963ada71944e6db';

// Contract addresses from the successful deployment
const SEPOLIA_MAILBOX = '0xB1DD9ca81fe29377e70E72ab59C095d2B7052b9d';
const BASE_SEPOLIA_MAILBOX = '0x71101452d0efcbb75bb3E2D65401A3eAD2423643';
const SEPOLIA_TEST_RECIPIENT = '0x14cB93164A76075f9735c92cfa133a93e19677bc';
const BASE_SEPOLIA_TEST_RECIPIENT = '0x309D9EB90eEf23bbB886FDa51064d899DA00E42E';

const SEPOLIA_DOMAIN = 11155111;
const BASE_SEPOLIA_DOMAIN = 84532;

// Mailbox ABI (minimal for sending messages)
const MAILBOX_ABI = [
    'function dispatch(uint32 destinationDomain, bytes32 recipientAddress, bytes calldata messageBody) external payable returns (bytes32 messageId)',
    'function delivered(bytes32 messageId) external view returns (bool)',
    'event Dispatch(address indexed sender, uint32 indexed destination, bytes32 indexed recipient, bytes32 message)',
    'event Process(uint32 indexed origin, bytes32 indexed sender, bytes32 indexed recipient)'
];

async function main() {
    console.log('🚀 Starting cross-chain message test...\n');
    
    // Setup providers and wallet
    const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    const baseSepoliaProvider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
    const wallet = new ethers.Wallet(PRIVATE_KEY);
    const seporiaSigner = wallet.connect(sepoliaProvider);
    const baseSepoliaSigner = wallet.connect(baseSepoliaProvider);
    
    console.log(`Sender address: ${wallet.address}`);
    
    // Get current balances
    const sepoliaBalance = await sepoliaProvider.getBalance(wallet.address);
    const baseSepoliaBalance = await baseSepoliaProvider.getBalance(wallet.address);
    console.log(`Sepolia balance: ${ethers.formatEther(sepoliaBalance)} ETH`);
    console.log(`Base Sepolia balance: ${ethers.formatEther(baseSepoliaBalance)} ETH\n`);
    
    // Create mailbox contract instances
    const sepoliaMailbox = new ethers.Contract(SEPOLIA_MAILBOX, MAILBOX_ABI, seporiaSigner);
    const baseSepoliaMailbox = new ethers.Contract(BASE_SEPOLIA_MAILBOX, MAILBOX_ABI, baseSepoliaSigner);
    
    // Create unique test message with timestamp
    const timestamp = Math.floor(Date.now() / 1000);
    const messageBody = ethers.toUtf8Bytes(`Hello from Sepolia! Timestamp: ${timestamp} - Testing cross-chain delivery`);
    console.log(`📤 Sending message: "${ethers.toUtf8String(messageBody)}"`);
    
    // Convert recipient address to bytes32 format
    const recipientBytes32 = ethers.zeroPadValue(BASE_SEPOLIA_TEST_RECIPIENT, 32);
    console.log(`📍 Destination: Base Sepolia (domain ${BASE_SEPOLIA_DOMAIN})`);
    console.log(`📍 Recipient: ${BASE_SEPOLIA_TEST_RECIPIENT}\n`);
    
    try {
        // Send the message
        console.log('📡 Dispatching message...');
        const tx = await sepoliaMailbox.dispatch(
            BASE_SEPOLIA_DOMAIN,
            recipientBytes32,
            messageBody,
            { gasLimit: 200000 } // Set gas limit for reliability
        );
        
        console.log(`✅ Transaction sent: ${tx.hash}`);
        console.log(`🔗 Sepolia TX: https://sepolia.etherscan.io/tx/${tx.hash}`);
        
        // Wait for confirmation
        console.log('⏳ Waiting for transaction confirmation...');
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        
        // Extract message ID from events
        let messageId = null;
        for (const log of receipt.logs) {
            try {
                const parsed = sepoliaMailbox.interface.parseLog(log);
                if (parsed && parsed.name === 'Dispatch') {
                    messageId = parsed.args.message;
                    console.log(`📨 Message ID: ${messageId}`);
                    break;
                }
            } catch (e) {
                // Skip unparseable logs
            }
        }
        
        if (!messageId) {
            console.log('❌ Could not extract message ID from transaction receipt');
            return;
        }
        
        // Now check for delivery on Base Sepolia
        console.log('\n🔍 Checking for message delivery on Base Sepolia...');
        
        // Set up event listener for Process events
        let delivered = false;
        let deliveryTxHash = null;
        
        const processFilter = baseSepoliaMailbox.filters.Process();
        
        // Check if already delivered
        try {
            const isDelivered = await baseSepoliaMailbox.delivered(messageId);
            if (isDelivered) {
                delivered = true;
                console.log('✅ Message already delivered!');
            }
        } catch (e) {
            console.log('⚠️  Could not check delivery status, will monitor events...');
        }
        
        if (!delivered) {
            console.log('⏳ Message not yet delivered, monitoring for delivery events...');
            console.log('💡 This may take a few minutes as validators need to sign and relayer needs to process...');
            
            // Monitor for delivery events for up to 10 minutes
            const timeout = setTimeout(() => {
                console.log('⏰ Timeout reached (10 minutes). Message delivery monitoring stopped.');
                console.log('💡 Note: Message may still be delivered later. Check Base Sepolia explorer manually.');
            }, 600000); // 10 minutes
            
            baseSepoliaMailbox.on(processFilter, async (origin, sender, recipient, event) => {
                console.log(`\n🎉 DELIVERY EVENT DETECTED!`);
                console.log(`📤 Origin domain: ${origin}`);
                console.log(`👤 Sender: ${sender}`);
                console.log(`📍 Recipient: ${recipient}`);
                console.log(`📦 Transaction: ${event.log.transactionHash}`);
                console.log(`🔗 Base Sepolia TX: https://base-sepolia.blockscout.com/tx/${event.log.transactionHash}`);
                
                deliveryTxHash = event.log.transactionHash;
                delivered = true;
                clearTimeout(timeout);
                
                // Verify message is marked as delivered
                try {
                    const finalDeliveredStatus = await baseSepoliaMailbox.delivered(messageId);
                    console.log(`✅ Final delivery status: ${finalDeliveredStatus ? 'DELIVERED' : 'NOT DELIVERED'}`);
                    
                    if (finalDeliveredStatus) {
                        console.log('\n🎊 SUCCESS! Message delivered successfully!');
                        console.log('📊 DELIVERY PROOF:');
                        console.log(`   📤 Sent: Block ${receipt.blockNumber} on Sepolia`);
                        console.log(`   📥 Delivered: Transaction ${deliveryTxHash} on Base Sepolia`);
                        console.log(`   🆔 Message ID: ${messageId}`);
                        console.log(`   ⏱️  Total delivery time: ${Math.floor((Date.now() / 1000) - timestamp)} seconds`);
                    }
                } catch (e) {
                    console.log('⚠️  Could not verify final delivery status');
                }
                
                process.exit(0);
            });
        }
        
        // Keep the script running to monitor for delivery
        if (!delivered) {
            console.log('🔄 Monitoring active. Press Ctrl+C to stop...\n');
        }
        
    } catch (error) {
        console.error('❌ Error sending message:', error);
        if (error.reason) {
            console.error(`Reason: ${error.reason}`);
        }
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Monitoring stopped by user');
    process.exit(0);
});

main().catch(console.error);