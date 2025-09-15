#!/usr/bin/env node
/**
 * Debug latest transaction to understand the log structure
 */

import { ethers } from 'ethers';

const SEPOLIA_RPC = 'https://eth-sepolia.g.alchemy.com/v2/lC2HDPB2Vs7-p-UPkgKD-VqFulU5elyk';
const TX_HASH = '0xa93b399b7be9ec013f6d218420cc884f2356335321c6fe9bcafd3e7ba9e5e851';

async function main() {
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    
    console.log('🔍 DEBUGGING LATEST TRANSACTION LOGS');
    console.log('=====================================');
    
    try {
        const receipt = await provider.getTransactionReceipt(TX_HASH);
        
        console.log(`📄 Transaction: ${TX_HASH}`);
        console.log(`📊 Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
        console.log(`📊 Block: ${receipt.blockNumber}`);
        console.log(`📊 Gas used: ${receipt.gasUsed.toString()}`);
        console.log(`📊 Total logs: ${receipt.logs.length}`);
        
        console.log('\n📋 ALL LOGS:');
        receipt.logs.forEach((log, index) => {
            console.log(`\n--- Log ${index} ---`);
            console.log(`Address: ${log.address}`);
            console.log(`Topics: ${log.topics.length}`);
            log.topics.forEach((topic, i) => {
                console.log(`  Topic ${i}: ${topic}`);
            });
            console.log(`Data: ${log.data}`);
            console.log(`Data Length: ${log.data.length}`);
        });
        
        // Known event signatures
        const DISPATCH_EVENT_OLD = ethers.id('Dispatch(address,uint32,bytes32,bytes32)');
        const DISPATCH_EVENT_NEW = ethers.id('Dispatch(address indexed,uint32 indexed,bytes32 indexed,bytes32)');
        const DISPATCH_EVENT_ALT = ethers.id('Dispatch(address,uint32,bytes32,bytes)');
        
        console.log(`\n🔍 Known Dispatch event signatures:`);
        console.log(`Old: ${DISPATCH_EVENT_OLD}`);
        console.log(`New: ${DISPATCH_EVENT_NEW}`);
        console.log(`Alt: ${DISPATCH_EVENT_ALT}`);
        
        // Try to match event signatures
        receipt.logs.forEach((log, index) => {
            const eventSig = log.topics[0];
            console.log(`\nLog ${index} signature: ${eventSig}`);
            
            if (eventSig === DISPATCH_EVENT_OLD) {
                console.log(`✅ Matches OLD Dispatch signature`);
                try {
                    // Try to decode with the old ABI
                    const abi = ['event Dispatch(address sender, uint32 destination, bytes32 recipient, bytes32 message)'];
                    const iface = new ethers.Interface(abi);
                    const decoded = iface.parseLog({
                        topics: log.topics,
                        data: log.data
                    });
                    console.log(`Decoded:`, decoded.args);
                } catch (e) {
                    console.log(`❌ Failed to decode: ${e.message}`);
                }
            }
            
            if (eventSig === DISPATCH_EVENT_NEW) {
                console.log(`✅ Matches NEW Dispatch signature`);
                try {
                    // Try to decode with the new ABI
                    const abi = ['event Dispatch(address indexed sender, uint32 indexed destination, bytes32 indexed recipient, bytes32 message)'];
                    const iface = new ethers.Interface(abi);
                    const decoded = iface.parseLog({
                        topics: log.topics,
                        data: log.data
                    });
                    console.log(`Decoded:`, decoded.args);
                } catch (e) {
                    console.log(`❌ Failed to decode: ${e.message}`);
                }
            }
            
            // Try manual extraction from topics
            if (log.topics.length >= 4) {
                console.log(`Manual topic extraction:`);
                console.log(`  Sender: ${log.topics[1]}`);
                console.log(`  Destination: ${log.topics[2]}`);
                console.log(`  Recipient: ${log.topics[3]}`);
                console.log(`  Data (message): ${log.data}`);
            }
        });
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

main().catch(console.error);