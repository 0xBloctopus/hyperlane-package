#!/usr/bin/env node
/**
 * Exhaustive search for the destination transaction hash
 * Search all transaction activity around the message dispatch time
 */

import { ethers } from 'ethers';

const MESSAGE_ID = '0x48ca60cbef6a3be051ed8847cb9ba45230c00a6687a585504e39c31230311602';
const BASE_SEPOLIA_RPC = 'https://base-sepolia.gateway.tenderly.co';
const BASE_SEPOLIA_MAILBOX = '0x758Fb1Ca86a4400F976e07e5cb98763687297da3';
const SEPOLIA_DISPATCH_BLOCK = 9203338; // From our source transaction
const DISPATCH_TIME = 1757871653; // From our message timestamp

async function main() {
    console.log('🔍 EXHAUSTIVE SEARCH FOR DESTINATION TX HASH');
    console.log('==============================================');
    
    const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
    
    console.log(`📨 Message ID: ${MESSAGE_ID}`);
    console.log(`📤 Sepolia dispatch block: ${SEPOLIA_DISPATCH_BLOCK}`);
    console.log(`⏰ Dispatch timestamp: ${DISPATCH_TIME}`);
    
    try {
        // Get the approximate Base Sepolia block at dispatch time
        const currentBlock = await provider.getBlockNumber();
        console.log(`📊 Current Base Sepolia block: ${currentBlock}`);
        
        // Search for blocks around the dispatch time
        const searchStartBlock = Math.max(0, currentBlock - 15000); // Go back further
        console.log(`🔍 Searching from block ${searchStartBlock} to ${currentBlock}`);
        
        // First, let's see if there are ANY transactions to our mailbox
        console.log(`\n🔍 Searching for ALL transactions to mailbox...`);
        
        let foundTransactions = [];
        
        // Search in chunks to avoid timeouts
        const chunkSize = 5000;
        for (let fromBlock = searchStartBlock; fromBlock < currentBlock; fromBlock += chunkSize) {
            const toBlock = Math.min(fromBlock + chunkSize - 1, currentBlock);
            
            try {
                console.log(`   Searching blocks ${fromBlock} to ${toBlock}...`);
                
                // Get all logs from the mailbox contract in this range
                const allLogs = await provider.getLogs({
                    address: BASE_SEPOLIA_MAILBOX,
                    fromBlock: fromBlock,
                    toBlock: toBlock
                });
                
                console.log(`   Found ${allLogs.length} logs in this range`);
                
                // Group logs by transaction hash
                const txHashes = [...new Set(allLogs.map(log => log.transactionHash))];
                
                for (const txHash of txHashes) {
                    const txLogs = allLogs.filter(log => log.transactionHash === txHash);
                    const firstLog = txLogs[0];
                    
                    foundTransactions.push({
                        txHash,
                        blockNumber: firstLog.blockNumber,
                        logCount: txLogs.length,
                        logs: txLogs
                    });
                }
                
            } catch (error) {
                console.log(`   ⚠️  Error searching blocks ${fromBlock}-${toBlock}: ${error.message}`);
            }
        }
        
        console.log(`\n📋 Found ${foundTransactions.length} transactions to the mailbox`);
        
        if (foundTransactions.length > 0) {
            // Sort by block number (most recent first)
            foundTransactions.sort((a, b) => b.blockNumber - a.blockNumber);
            
            console.log(`\n🎯 ALL MAILBOX TRANSACTIONS (most recent first):`);
            
            for (let i = 0; i < Math.min(foundTransactions.length, 10); i++) {
                const tx = foundTransactions[i];
                
                console.log(`\n--- Transaction #${i + 1} ---`);
                console.log(`📄 TX Hash: ${tx.txHash}`);
                console.log(`🔗 Base Explorer: https://base-sepolia.blockscout.com/tx/${tx.txHash}`);
                console.log(`📊 Block: ${tx.blockNumber}`);
                console.log(`📋 Logs: ${tx.logCount}`);
                
                try {
                    const txDetails = await provider.getTransaction(tx.txHash);
                    const receipt = await provider.getTransactionReceipt(tx.txHash);
                    
                    console.log(`👤 From: ${txDetails.from}`);
                    console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);
                    console.log(`✅ Status: ${receipt.status === 1 ? 'SUCCESS' : 'FAILED'}`);
                    
                    // Get block timestamp
                    const block = await provider.getBlock(tx.blockNumber);
                    const timeDiff = Math.abs(Number(block.timestamp) - DISPATCH_TIME);
                    console.log(`⏰ Block time: ${new Date(Number(block.timestamp) * 1000).toISOString()}`);
                    console.log(`⏰ Time diff from dispatch: ${timeDiff} seconds`);
                    
                    // Analyze the logs more carefully
                    let hasProcessEvent = false;
                    let hasDeliveryRelatedEvent = false;
                    
                    for (const log of tx.logs) {
                        // Check for Process events
                        if (log.topics[0] === ethers.id('Process(uint32,bytes32,bytes32)')) {
                            hasProcessEvent = true;
                            console.log(`   🎯 Contains Process event!`);
                            
                            // Decode if possible
                            try {
                                const originDomain = parseInt(log.topics[1]);
                                console.log(`   📍 Origin Domain: ${originDomain} ${originDomain === 11155111 ? '(Sepolia!)' : ''}`);
                            } catch (e) {
                                console.log(`   📍 Origin Domain: ${log.topics[1]}`);
                            }
                        }
                        
                        // Check for other delivery-related events
                        if (log.data.includes(MESSAGE_ID.slice(2))) {
                            hasDeliveryRelatedEvent = true;
                            console.log(`   🎯 Contains our message ID!`);
                        }
                    }
                    
                    if (hasProcessEvent && timeDiff < 3600) { // Within 1 hour
                        console.log(`\n🚨 POTENTIAL DELIVERY TRANSACTION FOUND!`);
                        console.log(`   This transaction contains a Process event and occurred close to dispatch time.`);
                        console.log(`   TX Hash: ${tx.txHash}`);
                        console.log(`   Explorer: https://base-sepolia.blockscout.com/tx/${tx.txHash}`);
                    }
                    
                    if (hasDeliveryRelatedEvent) {
                        console.log(`\n🚨 DEFINITIVE DELIVERY TRANSACTION FOUND!`);
                        console.log(`   This transaction contains our exact message ID!`);
                        console.log(`   TX Hash: ${tx.txHash}`);
                        console.log(`   Explorer: https://base-sepolia.blockscout.com/tx/${tx.txHash}`);
                    }
                    
                } catch (e) {
                    console.log(`   ⚠️  Could not fetch transaction details: ${e.message}`);
                }
            }
        }
        
        // Also search for transactions that might have interacted with the ISM
        console.log(`\n🔍 Alternative approach: searching for transactions around dispatch time...`);
        
        // Get blocks around the expected delivery time (a few minutes after dispatch)
        const estimatedDeliveryTime = DISPATCH_TIME + 300; // 5 minutes after dispatch
        
        for (let blockNum = currentBlock; blockNum > currentBlock - 1000; blockNum--) {
            try {
                const block = await provider.getBlock(blockNum);
                if (!block) continue;
                
                const timeDiff = Math.abs(Number(block.timestamp) - estimatedDeliveryTime);
                
                if (timeDiff < 600) { // Within 10 minutes of estimated delivery
                    console.log(`\n📊 Block ${blockNum} (${new Date(Number(block.timestamp) * 1000).toISOString()}) - ${timeDiff}s from estimated delivery`);
                    
                    if (block.transactions && block.transactions.length > 0) {
                        console.log(`   Contains ${block.transactions.length} transactions`);
                        
                        // Check each transaction in this timeframe
                        for (const txHash of block.transactions.slice(0, 5)) { // Check first 5 transactions
                            try {
                                const receipt = await provider.getTransactionReceipt(txHash);
                                
                                // Check if this transaction has logs related to our mailbox or message
                                const relevantLogs = receipt.logs.filter(log => 
                                    log.address.toLowerCase() === BASE_SEPOLIA_MAILBOX.toLowerCase() ||
                                    log.data.includes(MESSAGE_ID.slice(2))
                                );
                                
                                if (relevantLogs.length > 0) {
                                    console.log(`   🎯 FOUND RELEVANT TX: ${txHash}`);
                                    console.log(`   🔗 Explorer: https://base-sepolia.blockscout.com/tx/${txHash}`);
                                }
                            } catch (e) {
                                // Skip if we can't get the receipt
                            }
                        }
                    }
                }
            } catch (e) {
                // Skip if we can't get the block
            }
        }
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

main().catch(console.error);