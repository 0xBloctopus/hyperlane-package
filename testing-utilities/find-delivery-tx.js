#!/usr/bin/env node
/**
 * Find the actual delivery transaction on Base Sepolia
 */

import { ethers } from 'ethers';

const BASE_SEPOLIA_RPC = 'https://base-sepolia.gateway.tenderly.co';
const BASE_SEPOLIA_MAILBOX = '0x758Fb1Ca86a4400F976e07e5cb98763687297da3';
const MESSAGE_ID = '0x68cdc2fdc788ac4ac2a3d886a9fa9838a9c2dc95fa13fde938941f36acd7d3ba';
const SEPOLIA_DOMAIN = 11155111;

async function main() {
    console.log('🔍 FINDING DELIVERY TRANSACTION ON BASE SEPOLIA');
    console.log('===============================================');
    
    const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
    
    // Get current block and search back from dispatch time
    const currentBlock = await provider.getBlockNumber();
    const searchFromBlock = 31049000; // Around dispatch time
    
    console.log(`📊 Searching blocks ${searchFromBlock} to ${currentBlock}`);
    console.log(`📨 Looking for message: ${MESSAGE_ID}`);
    
    try {
        // Search for Process events from Sepolia domain
        const processEventTopic = ethers.id('Process(uint32,bytes32,bytes32)');
        const sepoliaDomainHex = ethers.zeroPadValue(ethers.toBeHex(SEPOLIA_DOMAIN), 32);
        
        console.log(`🔍 Process event topic: ${processEventTopic}`);
        console.log(`🔍 Sepolia domain hex: ${sepoliaDomainHex}`);
        
        // Search in chunks to avoid rate limits
        const chunkSize = 2000;
        let searchFrom = searchFromBlock;
        
        while (searchFrom <= currentBlock) {
            const searchTo = Math.min(searchFrom + chunkSize, currentBlock);
            console.log(`🔍 Searching blocks ${searchFrom} to ${searchTo}...`);
            
            try {
                const logs = await provider.getLogs({
                    address: BASE_SEPOLIA_MAILBOX,
                    topics: [processEventTopic, sepoliaDomainHex],
                    fromBlock: searchFrom,
                    toBlock: searchTo
                });
                
                console.log(`📋 Found ${logs.length} Process events in this range`);
                
                for (const log of logs) {
                    console.log(`\n🎯 FOUND PROCESS EVENT:`);
                    console.log(`   Block: ${log.blockNumber}`);
                    console.log(`   TX Hash: ${log.transactionHash}`);
                    console.log(`   Topics: ${log.topics.length}`);
                    
                    // Get transaction details
                    const tx = await provider.getTransaction(log.transactionHash);
                    const receipt = await provider.getTransactionReceipt(log.transactionHash);
                    
                    console.log(`\n📄 DELIVERY TRANSACTION FOUND:`);
                    console.log(`   🔗 TX Hash: ${log.transactionHash}`);
                    console.log(`   🔗 Base Explorer: https://base-sepolia.blockscout.com/tx/${log.transactionHash}`);
                    console.log(`   📊 Block: ${log.blockNumber}`);
                    console.log(`   👤 From (Relayer): ${tx.from}`);
                    console.log(`   📍 To (Mailbox): ${tx.to}`);
                    console.log(`   ⛽ Gas Used: ${receipt.gasUsed.toString()}`);
                    console.log(`   ✅ Status: ${receipt.status === 1 ? 'SUCCESS' : 'FAILED'}`);
                    
                    // Parse the event
                    try {
                        const abi = ['event Process(uint32 indexed origin, bytes32 indexed sender, bytes32 indexed recipient)'];
                        const iface = new ethers.Interface(abi);
                        const decoded = iface.parseLog({
                            topics: log.topics,
                            data: log.data
                        });
                        
                        console.log(`\n📊 Process Event Details:`);
                        console.log(`   Origin Domain: ${decoded.args.origin}`);
                        console.log(`   Sender: ${decoded.args.sender}`);
                        console.log(`   Recipient: ${decoded.args.recipient}`);
                        
                    } catch (e) {
                        console.log(`⚠️  Could not decode event: ${e.message}`);
                    }
                    
                    console.log(`\n🎉 PROOF OF DELIVERY FOUND!`);
                    console.log(`📤 Source: https://sepolia.etherscan.io/tx/0xead03807d93d7bd68a908538302f0c012da738a19fb237fbe649d4878d36bf9d`);
                    console.log(`📥 Delivery: https://base-sepolia.blockscout.com/tx/${log.transactionHash}`);
                    
                    return;
                }
                
            } catch (error) {
                console.log(`⚠️  Error searching blocks ${searchFrom}-${searchTo}: ${error.message}`);
            }
            
            searchFrom = searchTo + 1;
        }
        
        console.log(`\n❌ No Process events found in the searched range`);
        console.log(`💡 Message may still be processing or delivered in a different block range`);
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

main().catch(console.error);