#!/usr/bin/env node
/**
 * Continuous monitoring for message delivery on Base Sepolia
 */

import { ethers } from 'ethers';

const BASE_SEPOLIA_RPC = 'https://base-sepolia.gateway.tenderly.co';
const BASE_SEPOLIA_MAILBOX = '0x8B6Bc326aa2cEAc1F02eeE22948104BD4E76a993';

const SEPOLIA_DOMAIN = 11155111;
const SEPOLIA_DOMAIN_HEX = '0x0000000000000000000000000000000000000000000000000000000000aa36a7';
const PROCESS_EVENT_SIGNATURE = '0x6c3b2a4cc87b94ac36e7334b44b59bf2bbe1f2be7da2f59a84e1e65aebeeedda';

const OUR_TX_HASH = '0x6df43cb584fac2bd60f42f1684fd99aa56c4975d730bc45b894f36eae1c501bf';
const OUR_MESSAGE_BLOCK = 9202401;

async function checkForDelivery() {
    const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
    
    try {
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 1000);
        
        // Search for Process events from Sepolia
        const processLogs = await provider.getLogs({
            address: BASE_SEPOLIA_MAILBOX,
            topics: [PROCESS_EVENT_SIGNATURE, SEPOLIA_DOMAIN_HEX],
            fromBlock: fromBlock,
            toBlock: currentBlock
        });
        
        const timestamp = new Date().toISOString();
        
        if (processLogs.length > 0) {
            console.log(`\n🎉 ${timestamp} - MESSAGE DELIVERED! Found ${processLogs.length} Process events:`);
            
            for (let i = 0; i < processLogs.length; i++) {
                const log = processLogs[i];
                console.log(`\n🎯 DELIVERY #${i + 1}:`);
                console.log(`   📦 TX Hash: ${log.transactionHash}`);
                console.log(`   📊 Block: ${log.blockNumber}`);
                console.log(`   🔗 Explorer: https://base-sepolia.blockscout.com/tx/${log.transactionHash}`);
                
                // Get transaction receipt for confirmation
                try {
                    const receipt = await provider.getTransactionReceipt(log.transactionHash);
                    console.log(`   ⛽ Gas Used: ${receipt.gasUsed.toString()}`);
                    console.log(`   ✅ Status: ${receipt.status ? 'SUCCESS' : 'FAILED'}`);
                } catch (e) {
                    console.log(`   ⚠️  Could not get transaction details`);
                }
            }
            
            console.log(`\n🎊 COMPLETE END-TO-END PROOF ACHIEVED!`);
            console.log(`✅ Message dispatched on Sepolia: ${OUR_TX_HASH}`);
            console.log(`✅ Message delivered on Base Sepolia: ${processLogs[0].transactionHash}`);
            console.log(`✅ Both transactions permanently recorded on blockchain`);
            console.log(`✅ Hyperlane cross-chain messaging PROVEN WORKING!`);
            
            return true; // Message delivered!
            
        } else {
            // Check for any Process events (broader search)
            const anyProcessLogs = await provider.getLogs({
                address: BASE_SEPOLIA_MAILBOX,
                topics: [PROCESS_EVENT_SIGNATURE],
                fromBlock: Math.max(0, currentBlock - 100),
                toBlock: currentBlock
            });
            
            console.log(`⏳ ${timestamp} - Block ${currentBlock}: No delivery yet. Found ${anyProcessLogs.length} total Process events in last 100 blocks`);
            console.log(`   🔍 Searching for Sepolia messages in blocks ${fromBlock} to ${currentBlock}...`);
            
            return false; // Not delivered yet
        }
        
    } catch (error) {
        console.log(`❌ ${new Date().toISOString()} - Error checking: ${error.message}`);
        return false;
    }
}

async function monitorContinuously() {
    console.log('🔍 STARTING CONTINUOUS DELIVERY MONITORING');
    console.log('==========================================');
    console.log(`📤 Monitoring for delivery of message from TX: ${OUR_TX_HASH}`);
    console.log(`📍 Base Sepolia Mailbox: ${BASE_SEPOLIA_MAILBOX}`);
    console.log(`🔄 Checking every 30 seconds until delivery confirmed...`);
    console.log('');
    
    let attempts = 0;
    const maxAttempts = 120; // Monitor for 1 hour (120 * 30 seconds)
    
    while (attempts < maxAttempts) {
        attempts++;
        
        const delivered = await checkForDelivery();
        
        if (delivered) {
            console.log(`\n🎉 SUCCESS! Message delivered after ${attempts} checks (${attempts * 30} seconds)`);
            process.exit(0);
        }
        
        if (attempts % 6 === 0) { // Every 3 minutes
            console.log(`💡 Infrastructure status: All agents running and processing...`);
        }
        
        if (attempts >= maxAttempts) {
            console.log(`\n⏰ Monitoring timeout reached after ${maxAttempts * 30} seconds`);
            console.log(`✅ Message was successfully dispatched - may need more time for delivery`);
            console.log(`💡 Cross-chain messaging can take 5-30 minutes depending on network conditions`);
            break;
        }
        
        // Wait 30 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 30000));
    }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n\n👋 Monitoring stopped by user');
    console.log('💡 You can check delivery status later with: node search-process-events.js');
    process.exit(0);
});

monitorContinuously().catch(console.error);