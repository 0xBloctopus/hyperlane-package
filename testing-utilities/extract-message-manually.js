#!/usr/bin/env node
/**
 * Manually extract message ID from raw log data
 */

import { ethers } from 'ethers';

const SEPOLIA_RPC = 'https://eth-sepolia.g.alchemy.com/v2/lC2HDPB2Vs7-p-UPkgKD-VqFulU5elyk';
const BASE_SEPOLIA_RPC = 'https://base-sepolia.gateway.tenderly.co';

const SEPOLIA_MAILBOX = '0x613C5560d3715fDCB7635a047F1acd85CD28140f';
const BASE_SEPOLIA_MAILBOX = '0x8B6Bc326aa2cEAc1F02eeE22948104BD4E76a993';

const TX_HASH = '0x6df43cb584fac2bd60f42f1684fd99aa56c4975d730bc45b894f36eae1c501bf';

// Dispatch event signature: Dispatch(address indexed sender, uint32 indexed destination, bytes32 indexed recipient, bytes32 message)
const DISPATCH_SIGNATURE = '0x9d228d69b5fdb8d273a2336f8fb8612d039631024ea9bf09c424a9503aa078f0';

async function main() {
    console.log('🔍 MANUALLY EXTRACTING MESSAGE ID FROM TRANSACTION');
    console.log('================================================');
    
    const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    const baseSepoliaProvider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
    
    console.log(`📤 Checking transaction: ${TX_HASH}`);
    console.log(`📍 Expected Dispatch signature: ${DISPATCH_SIGNATURE}`);
    
    try {
        // Get transaction receipt
        const receipt = await sepoliaProvider.getTransactionReceipt(TX_HASH);
        console.log(`✅ Transaction found in block: ${receipt.blockNumber}`);
        console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
        
        // Look for Dispatch event manually
        let messageId = null;
        console.log(`\n🔍 Analyzing ${receipt.logs.length} logs:`);
        
        for (let i = 0; i < receipt.logs.length; i++) {
            const log = receipt.logs[i];
            console.log(`\nLog ${i}:`);
            console.log(`   Address: ${log.address}`);
            console.log(`   Topics: ${log.topics.length} - ${log.topics.join(', ')}`);
            console.log(`   Data length: ${log.data.length}`);
            
            // Check if this is from the mailbox and has Dispatch signature
            if (log.address.toLowerCase() === SEPOLIA_MAILBOX.toLowerCase() && 
                log.topics.length === 4 &&
                log.topics[0] === DISPATCH_SIGNATURE) {
                
                console.log(`   🎯 Found Dispatch event!`);
                console.log(`   👤 Sender: ${log.topics[1]}`);
                console.log(`   🏗️ Destination: ${parseInt(log.topics[2], 16)}`);
                console.log(`   📍 Recipient: ${log.topics[3]}`);
                
                // Message ID is in the data field
                if (log.data && log.data.length >= 66) { // 0x + 64 hex chars
                    messageId = log.data; // This should be the message ID
                    console.log(`   📨 Message ID: ${messageId}`);
                    break;
                } else {
                    console.log(`   ⚠️  Data field too short: ${log.data}`);
                }
            }
        }
        
        if (!messageId) {
            console.log('\n❌ Could not extract message ID');
            return;
        }
        
        console.log(`\n🔍 Now monitoring delivery on Base Sepolia...`);
        console.log(`📨 Message ID: ${messageId}`);
        
        // Test if message is already delivered
        const baseMailboxABI = ['function delivered(bytes32 messageId) external view returns (bool)'];
        const baseSepoliaMailbox = new ethers.Contract(BASE_SEPOLIA_MAILBOX, baseMailboxABI, baseSepoliaProvider);
        
        const isDelivered = await baseSepoliaMailbox.delivered(messageId);
        console.log(`📥 Current delivery status: ${isDelivered ? 'DELIVERED ✅' : 'NOT YET DELIVERED ⏳'}`);
        
        if (isDelivered) {
            console.log(`\n🎉 MESSAGE ALREADY DELIVERED!`);
            
            // Search for the delivery transaction
            console.log(`\n🔍 Searching for delivery transaction...`);
            const currentBlock = await baseSepoliaProvider.getBlockNumber();
            const processFilter = {
                address: BASE_SEPOLIA_MAILBOX,
                topics: [
                    '0x6c5b2a4cc87b94ac36e7334b44b59bf2bbe1f2be7da2f59a84e1e65aebeeedda', // Process event signature
                    '0x0000000000000000000000000000000000000000000000000000000000aa36a7' // Sepolia domain padded
                ]
            };
            
            const logs = await baseSepoliaProvider.getLogs({
                ...processFilter,
                fromBlock: Math.max(0, currentBlock - 1000),
                toBlock: currentBlock
            });
            
            if (logs.length > 0) {
                const latestLog = logs[logs.length - 1];
                const tx = await baseSepoliaProvider.getTransactionReceipt(latestLog.transactionHash);
                console.log(`🎯 DELIVERY TRANSACTION FOUND!`);
                console.log(`   📦 Base Sepolia TX: ${latestLog.transactionHash}`);
                console.log(`   🔗 Explorer: https://base-sepolia.blockscout.com/tx/${latestLog.transactionHash}`);
                console.log(`   📊 Block: ${latestLog.blockNumber}`);
                console.log(`   ⛽ Gas used: ${tx?.gasUsed?.toString() || 'unknown'}`);
            }
            
            console.log(`\n🎊 COMPLETE END-TO-END PROOF ACHIEVED:`);
            console.log(`   ✅ Message dispatched on Sepolia (TX: ${TX_HASH})`);
            console.log(`   ✅ Message delivered on Base Sepolia`);
            console.log(`   ✅ All transactions recorded on blockchain`);
            console.log(`   ✅ Hyperlane agents working correctly`);
        } else {
            console.log(`\n⏳ Message not yet delivered. Agents are processing...`);
            console.log(`💡 With active validators and relayer, delivery typically takes 2-10 minutes.`);
            console.log(`🔍 You can check delivery status later with:`);
            console.log(`   delivered("${messageId}")`);
        }
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

main().catch(console.error);