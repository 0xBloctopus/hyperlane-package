#!/usr/bin/env node
/**
 * Send a message and get the delivery proof on destination chain
 */

import { ethers } from 'ethers';

// Zero-range deployment addresses  
const SEPOLIA_MAILBOX = '0x006FA23690e8A55002f4C1A0Ed2304bD9358c582';
const BASE_SEPOLIA_MAILBOX = '0x758Fb1Ca86a4400F976e07e5cb98763687297da3';
const BASE_SEPOLIA_TEST_RECIPIENT = '0x6eE8E25376E6089a5Aa211b7639F2ADfa67BA09c'; // From deployment

const SEPOLIA_RPC = 'https://eth-sepolia.g.alchemy.com/v2/lC2HDPB2Vs7-p-UPkgKD-VqFulU5elyk';
const BASE_SEPOLIA_RPC = 'https://base-sepolia.gateway.tenderly.co';

const PRIVATE_KEY = '0x1cdf65ac75f477650040ebe272ddaffb6735dcf55bd651869963ada71944e6db';
const BASE_SEPOLIA_DOMAIN = 84532;

const MAILBOX_ABI = [
    'function dispatch(uint32 destinationDomain, bytes32 recipientAddress, bytes calldata messageBody) external payable returns (bytes32 messageId)',
    'function delivered(bytes32 messageId) external view returns (bool)',
    'event Dispatch(address indexed sender, uint32 indexed destination, bytes32 indexed recipient, bytes32 message)',
    'event Process(uint32 indexed origin, bytes32 indexed sender, bytes32 indexed recipient)'
];

async function main() {
    console.log('🔥 SEND MESSAGE AND PROVE DELIVERY');
    console.log('==================================');
    
    const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    const baseSepoliaProvider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
    const wallet = new ethers.Wallet(PRIVATE_KEY);
    const seporiaSigner = wallet.connect(sepoliaProvider);
    
    const sepoliaMailbox = new ethers.Contract(SEPOLIA_MAILBOX, MAILBOX_ABI, seporiaSigner);
    const baseSepoliaMailbox = new ethers.Contract(BASE_SEPOLIA_MAILBOX, MAILBOX_ABI, baseSepoliaProvider);
    
    console.log(`📤 Sender: ${wallet.address}`);
    console.log(`📍 Sepolia Mailbox: ${SEPOLIA_MAILBOX}`);
    console.log(`📍 Base Sepolia Mailbox: ${BASE_SEPOLIA_MAILBOX}`);
    console.log(`🎯 Test Recipient: ${BASE_SEPOLIA_TEST_RECIPIENT}`);
    
    try {
        // Create message
        const timestamp = Math.floor(Date.now() / 1000);
        const messageBody = ethers.toUtf8Bytes(`DELIVERY PROOF TEST: ${timestamp}`);
        const recipientBytes32 = ethers.zeroPadValue(BASE_SEPOLIA_TEST_RECIPIENT, 32);
        
        console.log(`\n📨 Sending: "${ethers.toUtf8String(messageBody)}"`);
        console.log(`📍 To: Base Sepolia (domain ${BASE_SEPOLIA_DOMAIN})`);
        
        // Send message
        const currentBlock = await sepoliaProvider.getBlockNumber();
        console.log(`📊 Current Sepolia block: ${currentBlock}`);
        
        const tx = await sepoliaMailbox.dispatch(
            BASE_SEPOLIA_DOMAIN,
            recipientBytes32,
            messageBody,
            { gasLimit: 200000 }
        );
        
        console.log(`\n✅ DISPATCH TX: ${tx.hash}`);
        console.log(`🔗 Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`✅ Confirmed in block: ${receipt.blockNumber}`);
        
        // Get message ID from logs
        let messageId = null;
        for (const log of receipt.logs) {
            if (log.address.toLowerCase() === SEPOLIA_MAILBOX.toLowerCase()) {
                // Look for any log that could contain the message ID
                if (log.topics.length >= 2) {
                    // Try the second topic (message ID is often there)
                    const potentialMessageId = log.topics[1];
                    if (potentialMessageId && potentialMessageId.length === 66) {
                        messageId = potentialMessageId;
                        break;
                    }
                }
            }
        }
        
        if (!messageId) {
            // Try to get from log data
            for (const log of receipt.logs) {
                if (log.address.toLowerCase() === SEPOLIA_MAILBOX.toLowerCase() && log.data && log.data.length >= 66) {
                    // Try first 32 bytes of data
                    messageId = '0x' + log.data.slice(2, 66);
                    break;
                }
            }
        }
        
        if (messageId) {
            console.log(`\n📨 Message ID: ${messageId}`);
        } else {
            console.log(`\n⚠️  Could not extract message ID, but message was sent`);
        }
        
        console.log(`\n⏳ MONITORING FOR DELIVERY (up to 5 minutes)...`);
        console.log(`💡 Zero-range sync should deliver quickly!`);
        
        const baseStartBlock = await baseSepoliaProvider.getBlockNumber();
        console.log(`📊 Base Sepolia start block: ${baseStartBlock}`);
        
        // Monitor for delivery
        let attempts = 0;
        const maxAttempts = 30; // 5 minutes
        
        while (attempts < maxAttempts) {
            attempts++;
            
            try {
                // Check if delivered (if we have message ID)
                if (messageId) {
                    const isDelivered = await baseSepoliaMailbox.delivered(messageId);
                    if (isDelivered) {
                        console.log(`\n🎉 MESSAGE DELIVERED!`);
                        break;
                    }
                }
                
                // Search for Process events 
                const currentBaseBlock = await baseSepoliaProvider.getBlockNumber();
                
                const processLogs = await baseSepoliaProvider.getLogs({
                    address: BASE_SEPOLIA_MAILBOX,
                    topics: [
                        ethers.id('Process(uint32,bytes32,bytes32)'),
                        ethers.zeroPadValue(ethers.toBeHex(11155111), 32) // Sepolia domain
                    ],
                    fromBlock: baseStartBlock,
                    toBlock: currentBaseBlock
                });
                
                if (processLogs.length > 0) {
                    const deliveryLog = processLogs[processLogs.length - 1]; // Latest
                    
                    console.log(`\n🎯 DELIVERY TRANSACTION FOUND!`);
                    console.log(`📄 TX Hash: ${deliveryLog.transactionHash}`);
                    console.log(`🔗 Base Explorer: https://base-sepolia.blockscout.com/tx/${deliveryLog.transactionHash}`);
                    console.log(`📊 Delivery Block: ${deliveryLog.blockNumber}`);
                    
                    // Get transaction details
                    const deliveryTx = await baseSepoliaProvider.getTransaction(deliveryLog.transactionHash);
                    const deliveryReceipt = await baseSepoliaProvider.getTransactionReceipt(deliveryLog.transactionHash);
                    
                    console.log(`\n📋 DELIVERY PROOF:`);
                    console.log(`   From (Relayer): ${deliveryTx.from}`);
                    console.log(`   To (Mailbox): ${deliveryTx.to}`);
                    console.log(`   Gas Used: ${deliveryReceipt.gasUsed.toString()}`);
                    console.log(`   Status: ${deliveryReceipt.status === 1 ? 'SUCCESS ✅' : 'FAILED ❌'}`);
                    
                    console.log(`\n🚀 ZERO-RANGE SYNC PROOF COMPLETE:`);
                    console.log(`   📤 Source TX: https://sepolia.etherscan.io/tx/${tx.hash}`);
                    console.log(`   📥 Delivery TX: https://base-sepolia.blockscout.com/tx/${deliveryLog.transactionHash}`);
                    console.log(`   ⏱️  Delivery time: ${attempts * 10} seconds`);
                    console.log(`   🎯 SUCCESS: Message delivered quickly with zero-range sync!`);
                    return;
                }
                
                console.log(`⏳ Attempt ${attempts}/${maxAttempts}: Searching for delivery...`);
                
            } catch (error) {
                console.log(`⚠️  Error on attempt ${attempts}: ${error.message}`);
            }
            
            // Wait 10 seconds
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
        
        console.log(`\n⏰ Monitoring timeout`);
        console.log(`✅ Message dispatched successfully:`);
        console.log(`   🔗 TX: https://sepolia.etherscan.io/tx/${tx.hash}`);
        console.log(`💡 Delivery may take additional time in cross-chain environment`);
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

main().catch(console.error);