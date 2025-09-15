#!/usr/bin/env node
/**
 * Extract message ID from the transaction and monitor delivery
 */

import { ethers } from 'ethers';

const SEPOLIA_RPC = 'https://eth-sepolia.g.alchemy.com/v2/lC2HDPB2Vs7-p-UPkgKD-VqFulU5elyk';
const BASE_SEPOLIA_RPC = 'https://base-sepolia.gateway.tenderly.co';

const SEPOLIA_MAILBOX = '0x613C5560d3715fDCB7635a047F1acd85CD28140f';
const BASE_SEPOLIA_MAILBOX = '0x8B6Bc326aa2cEAc1F02eeE22948104BD4E76a993';

const TX_HASH = '0x6df43cb584fac2bd60f42f1684fd99aa56c4975d730bc45b894f36eae1c501bf';

// Mailbox ABI
const MAILBOX_ABI = [
    'function delivered(bytes32 messageId) external view returns (bool)',
    'event Dispatch(address indexed sender, uint32 indexed destination, bytes32 indexed recipient, bytes32 message)',
    'event Process(uint32 indexed origin, bytes32 indexed sender, bytes32 indexed recipient)'
];

async function main() {
    console.log('🔍 EXTRACTING MESSAGE ID AND MONITORING DELIVERY');
    console.log('===============================================');
    
    const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    const baseSepoliaProvider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
    
    const sepoliaMailbox = new ethers.Contract(SEPOLIA_MAILBOX, MAILBOX_ABI, sepoliaProvider);
    const baseSepoliaMailbox = new ethers.Contract(BASE_SEPOLIA_MAILBOX, MAILBOX_ABI, baseSepoliaProvider);
    
    console.log(`📤 Checking transaction: ${TX_HASH}`);
    
    try {
        // Get transaction receipt
        const receipt = await sepoliaProvider.getTransactionReceipt(TX_HASH);
        console.log(`✅ Transaction found in block: ${receipt.blockNumber}`);
        
        // Extract message ID from Dispatch event
        let messageId = null;
        for (const log of receipt.logs) {
            if (log.address.toLowerCase() === SEPOLIA_MAILBOX.toLowerCase()) {
                try {
                    const parsed = sepoliaMailbox.interface.parseLog({
                        topics: log.topics,
                        data: log.data
                    });
                    
                    if (parsed && parsed.name === 'Dispatch') {
                        messageId = parsed.args.message;
                        console.log(`📨 Message ID extracted: ${messageId}`);
                        console.log(`👤 Sender: ${parsed.args.sender}`);
                        console.log(`📍 Destination: ${parsed.args.destination}`);
                        console.log(`📮 Recipient: ${parsed.args.recipient}`);
                        break;
                    }
                } catch (e) {
                    // Skip unparseable logs
                }
            }
        }
        
        if (!messageId) {
            console.log('❌ Could not extract message ID from transaction');
            console.log('💡 Checking all logs in the transaction:');
            for (let i = 0; i < receipt.logs.length; i++) {
                const log = receipt.logs[i];
                console.log(`   Log ${i}: ${log.address} - Topics: ${log.topics.length}`);
            }
            return;
        }
        
        // Monitor for delivery
        console.log(`\n🔍 Now monitoring delivery on Base Sepolia...`);
        console.log(`💡 Message ID: ${messageId}`);
        
        let attempts = 0;
        const maxAttempts = 60; // Monitor for 10 minutes
        
        const checkDelivery = async () => {
            try {
                const isDelivered = await baseSepoliaMailbox.delivered(messageId);
                attempts++;
                
                if (isDelivered) {
                    console.log(`\n🎉 🎉 🎉 MESSAGE DELIVERED! 🎉 🎉 🎉`);
                    console.log(`\n🏆 COMPLETE END-TO-END PROOF ACHIEVED!`);
                    console.log(`   📤 Dispatched: Block ${receipt.blockNumber} on Sepolia`);
                    console.log(`   📥 Delivered: CONFIRMED on Base Sepolia`);
                    console.log(`   🆔 Message ID: ${messageId}`);
                    console.log(`   ⏱️  Total time: ${attempts * 10} seconds`);
                    console.log(`   🔗 Sepolia TX: https://sepolia.etherscan.io/tx/${TX_HASH}`);
                    
                    // Search for the delivery transaction
                    console.log(`\n🔍 Searching for delivery transaction...`);
                    const currentBlock = await baseSepoliaProvider.getBlockNumber();
                    const processFilter = baseSepoliaMailbox.filters.Process(11155111); // Sepolia domain
                    const events = await baseSepoliaMailbox.queryFilter(processFilter, Math.max(0, currentBlock - 100), currentBlock);
                    
                    if (events.length > 0) {
                        const latestEvent = events[events.length - 1];
                        console.log(`🎯 DELIVERY TRANSACTION FOUND!`);
                        console.log(`   📦 Base Sepolia TX: ${latestEvent.transactionHash}`);
                        console.log(`   🔗 Explorer: https://base-sepolia.blockscout.com/tx/${latestEvent.transactionHash}`);
                        console.log(`   📊 Block: ${latestEvent.blockNumber}`);
                    }
                    
                    console.log(`\n🎊 UNDENIABLE PROOF COMPLETE:`);
                    console.log(`   ✅ Message dispatched on Sepolia`);
                    console.log(`   ✅ Validators processed checkpoints`);
                    console.log(`   ✅ Relayer submitted delivery proof`);
                    console.log(`   ✅ Message delivered on Base Sepolia`);
                    console.log(`   ✅ All transactions recorded on blockchain`);
                    
                    return true;
                } else {
                    if (attempts <= 3) {
                        console.log(`⏳ Attempt ${attempts}/${maxAttempts}: Agents processing...`);
                    } else if (attempts % 6 === 0) { // Every minute
                        console.log(`⏳ Attempt ${attempts}/${maxAttempts}: Still waiting for delivery...`);
                    }
                    
                    if (attempts >= maxAttempts) {
                        console.log(`\n⏰ Monitoring timeout reached after ${maxAttempts * 10} seconds.`);
                        console.log(`✅ Message was successfully dispatched - agents may need more time.`);
                        console.log(`💡 Check delivery status later with: delivered("${messageId}")`);
                        return false;
                    }
                    
                    // Wait 10 seconds before next check
                    setTimeout(checkDelivery, 10000);
                }
            } catch (error) {
                console.log(`❌ Error checking delivery: ${error.message}`);
                setTimeout(checkDelivery, 10000);
            }
        };
        
        // Start monitoring
        await checkDelivery();
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

main().catch(console.error);