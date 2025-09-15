#!/usr/bin/env node
/**
 * Debug transaction logs to find Dispatch event
 */

import { ethers } from 'ethers';

const SEPOLIA_RPC = 'https://eth-sepolia.g.alchemy.com/v2/lC2HDPB2Vs7-p-UPkgKD-VqFulU5elyk';
const TX_HASH = '0xead03807d93d7bd68a908538302f0c012da738a19fb237fbe649d4878d36bf9d';

async function main() {
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    
    console.log('🔍 DEBUGGING TRANSACTION LOGS');
    console.log('=============================');
    
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
        });
        
        // Event signatures
        const DISPATCH_EVENT = ethers.id('Dispatch(address,uint32,bytes32,bytes32)');
        console.log(`\n🔍 Looking for Dispatch event signature: ${DISPATCH_EVENT}`);
        
        let dispatchFound = false;
        receipt.logs.forEach((log, index) => {
            if (log.topics[0] === DISPATCH_EVENT) {
                console.log(`\n🎯 DISPATCH EVENT FOUND in log ${index}!`);
                dispatchFound = true;
                
                // Try to decode
                try {
                    const abi = ['event Dispatch(address indexed sender, uint32 indexed destination, bytes32 indexed recipient, bytes32 message)'];
                    const iface = new ethers.Interface(abi);
                    const decoded = iface.parseLog({
                        topics: log.topics,
                        data: log.data
                    });
                    
                    console.log(`📨 Decoded Dispatch:`);
                    console.log(`   Sender: ${decoded.args.sender}`);
                    console.log(`   Destination: ${decoded.args.destination}`);
                    console.log(`   Recipient: ${decoded.args.recipient}`);
                    console.log(`   Message ID: ${decoded.args.message}`);
                } catch (e) {
                    console.log(`⚠️  Error decoding: ${e.message}`);
                }
            }
        });
        
        if (!dispatchFound) {
            console.log('\n❌ No Dispatch event found');
            console.log('🔍 Checking for other common events...');
            
            // Check for other event signatures
            const commonEvents = {
                'Transfer(address,address,uint256)': ethers.id('Transfer(address,address,uint256)'),
                'Approval(address,address,uint256)': ethers.id('Approval(address,address,uint256)'),
            };
            
            receipt.logs.forEach((log, index) => {
                for (const [name, sig] of Object.entries(commonEvents)) {
                    if (log.topics[0] === sig) {
                        console.log(`🔍 Found ${name} in log ${index}`);
                    }
                }
            });
        }
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

main().catch(console.error);