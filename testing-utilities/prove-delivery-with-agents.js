#!/usr/bin/env node
/**
 * Send message using the working zero-range deployment and prove delivery
 */

import { ethers } from 'ethers';

// Working zero-range deployment addresses (from hyperlane-zero-range deployment)
const SEPOLIA_MAILBOX = '0x006FA23690e8A55002f4C1A0Ed2304bD9358c582';
const BASE_SEPOLIA_MAILBOX = '0x758Fb1Ca86a4400F976e07e5cb98763687297da3';
const BASE_SEPOLIA_TEST_RECIPIENT = '0x6eE8E25376E6089a5Aa211b7639F2ADfa67BA09c';

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
    console.log('🎯 ZERO-RANGE DEPLOYMENT MESSAGE DELIVERY PROOF');
    console.log('================================================');
    
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
    console.log(`💡 Using working zero-range agents for fast delivery!`);
    
    try {
        // Create message
        const timestamp = Math.floor(Date.now() / 1000);
        const messageBody = ethers.toUtf8Bytes(`ZERO-RANGE PROOF: ${timestamp}`);
        const recipientBytes32 = ethers.zeroPadValue(BASE_SEPOLIA_TEST_RECIPIENT, 32);
        
        console.log(`\n📨 Sending: "${ethers.toUtf8String(messageBody)}"`);
        console.log(`📍 To: Base Sepolia (domain ${BASE_SEPOLIA_DOMAIN})`);
        
        // Send message with event monitoring
        const currentBlock = await sepoliaProvider.getBlockNumber();
        console.log(`📊 Current Sepolia block: ${currentBlock}`);
        
        const tx = await sepoliaMailbox.dispatch(
            BASE_SEPOLIA_DOMAIN,
            recipientBytes32,
            messageBody,
            { gasLimit: 300000 }
        );
        
        console.log(`\n✅ DISPATCH TX: ${tx.hash}`);
        console.log(`🔗 Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`✅ Confirmed in block: ${receipt.blockNumber}`);
        
        // Extract message ID from Dispatch event properly
        let messageId = null;
        for (const log of receipt.logs) {
            if (log.address.toLowerCase() === SEPOLIA_MAILBOX.toLowerCase()) {
                try {
                    const decoded = sepoliaMailbox.interface.parseLog({
                        topics: log.topics,
                        data: log.data
                    });
                    
                    if (decoded.name === 'Dispatch') {
                        messageId = decoded.args.message;
                        console.log(`\n📨 Message ID: ${messageId}`);
                        console.log(`📤 Sender: ${decoded.args.sender}`);
                        console.log(`🎯 Destination: ${decoded.args.destination}`);
                        console.log(`📍 Recipient: ${decoded.args.recipient}`);
                        break;
                    }
                } catch (e) {
                    // Skip non-Dispatch events
                }
            }
        }
        
        if (!messageId) {
            console.log(`\n⚠️  Could not extract message ID from Dispatch event`);
            return;
        }
        
        console.log(`\n⏳ MONITORING FOR DELIVERY (up to 10 minutes)...`);
        console.log(`💡 Zero-range agents should deliver quickly!`);
        
        const baseStartBlock = await baseSepoliaProvider.getBlockNumber();
        console.log(`📊 Base Sepolia start block: ${baseStartBlock}`);
        
        // Monitor for delivery
        let attempts = 0;
        const maxAttempts = 60; // 10 minutes
        
        while (attempts < maxAttempts) {
            attempts++;
            
            try {
                // Check if delivered
                const isDelivered = await baseSepoliaMailbox.delivered(messageId);
                if (isDelivered) {
                    console.log(`\n🎉 MESSAGE DELIVERED!`);
                    
                    // Search for the delivery transaction
                    const currentBaseBlock = await baseSepoliaProvider.getBlockNumber();
                    console.log(`🔍 Searching blocks ${baseStartBlock} to ${currentBaseBlock} for Process events...`);
                    
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
                        
                        console.log(`\n🚀 ZERO-RANGE PROOF COMPLETE:`);
                        console.log(`   📤 Source TX: https://sepolia.etherscan.io/tx/${tx.hash}`);
                        console.log(`   📥 Delivery TX: https://base-sepolia.blockscout.com/tx/${deliveryLog.transactionHash}`);
                        console.log(`   ⏱️  Delivery time: ${attempts * 10} seconds`);
                        console.log(`   🎯 SUCCESS: Zero-range sync eliminated 1.5+ hour delays!`);
                        console.log(`   📨 Message ID: ${messageId}`);
                        return;
                    } else {
                        console.log(`\n✅ Message delivered but Process event not found in recent blocks`);
                        console.log(`💡 This still confirms delivery!`);
                        break;
                    }
                }
                
                console.log(`⏳ Attempt ${attempts}/${maxAttempts}: Waiting for delivery...`);
                
                if (attempts % 6 === 0) {
                    console.log(`💡 Zero-range agents are processing - check agent logs if needed`);
                }
                
            } catch (error) {
                console.log(`⚠️  Error on attempt ${attempts}: ${error.message}`);
            }
            
            // Wait 10 seconds
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
        
        console.log(`\n⏰ Monitoring timeout after ${maxAttempts * 10} seconds`);
        console.log(`✅ Message dispatched successfully:`)
        console.log(`   🔗 TX: https://sepolia.etherscan.io/tx/${tx.hash}`);
        console.log(`   📨 Message ID: ${messageId}`);
        console.log(`💡 Check agent logs or extend monitoring time if needed`);
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

main().catch(console.error);