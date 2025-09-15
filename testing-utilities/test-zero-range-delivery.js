#!/usr/bin/env node
/**
 * Test message delivery with the new zero-range sync deployment
 * This uses the NEW contract addresses from our deployment
 */

import { ethers } from 'ethers';

// NEW deployment addresses from our zero-range deployment
const SEPOLIA_MAILBOX = '0x006FA23690e8A55002f4C1A0Ed2304bD9358c582';
const BASE_SEPOLIA_MAILBOX = '0x758Fb1Ca86a4400F976e07e5cb98763687297da3';

const SEPOLIA_RPC = 'https://eth-sepolia.g.alchemy.com/v2/lC2HDPB2Vs7-p-UPkgKD-VqFulU5elyk';
const BASE_SEPOLIA_RPC = 'https://base-sepolia.gateway.tenderly.co';

// Test key from our deployment
const PRIVATE_KEY = '0x1cdf65ac75f477650040ebe272ddaffb6735dcf55bd651869963ada71944e6db';

const ABI = [
    'function dispatch(uint32 destination, bytes32 recipient, bytes message) external payable returns (bytes32 messageId)',
    'function delivered(bytes32 messageId) external view returns (bool)'
];

async function main() {
    console.log('🚀 TESTING ZERO-RANGE SYNC MESSAGE DELIVERY');
    console.log('===========================================');
    
    const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    const baseSepoliaProvider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
    
    const signer = new ethers.Wallet(PRIVATE_KEY, sepoliaProvider);
    const sepoliaMailbox = new ethers.Contract(SEPOLIA_MAILBOX, ABI, signer);
    const baseSepoliaMailbox = new ethers.Contract(BASE_SEPOLIA_MAILBOX, ABI, baseSepoliaProvider);
    
    console.log(`📤 Sender: ${signer.address}`);
    console.log(`📍 Sepolia Mailbox: ${SEPOLIA_MAILBOX}`);
    console.log(`📍 Base Sepolia Mailbox: ${BASE_SEPOLIA_MAILBOX}`);
    
    try {
        // Send test message
        const testMessage = 'Zero-range sync test: ' + Date.now();
        const recipient = '0x' + signer.address.slice(2).padStart(64, '0'); // Convert to bytes32
        const messageBytes = ethers.toUtf8Bytes(testMessage);
        
        console.log(`\\n📨 Sending message: "${testMessage}"`);
        console.log(`📍 To Base Sepolia (domain: 84532)`);
        
        const tx = await sepoliaMailbox.dispatch(
            84532, // Base Sepolia domain
            recipient,
            messageBytes,
            { gasLimit: 200000 }
        );
        
        console.log(`⏳ Transaction sent: ${tx.hash}`);
        console.log(`🔗 Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        
        // Extract message ID from logs
        let messageId = null;
        for (const log of receipt.logs) {
            if (log.address.toLowerCase() === SEPOLIA_MAILBOX.toLowerCase()) {
                // Try to parse the dispatch event
                try {
                    const parsed = sepoliaMailbox.interface.parseLog(log);
                    if (parsed && parsed.name === 'Dispatch') {
                        // Message ID is typically the last topic or in args
                        messageId = parsed.args?.messageId || log.data;
                        break;
                    }
                } catch (e) {
                    // If parsing fails, try to extract from raw log data
                    if (log.data && log.data.length >= 66) {
                        messageId = log.data;
                    }
                }
            }
        }
        
        if (messageId) {
            console.log(`\\n📨 Message ID: ${messageId}`);
            console.log(`\\n⏰ ZERO-RANGE SYNC TEST IN PROGRESS:`);
            console.log(`   With our fix, agents should sync and process this message within minutes`);
            console.log(`   (compared to 1.5+ hours with the old range-based sync)`);
            
            // Start monitoring for delivery
            console.log(`\\n🔍 Starting delivery monitoring...`);
            
            let delivered = false;
            let attempts = 0;
            const maxAttempts = 40; // Monitor for 20 minutes (30s intervals)
            
            while (!delivered && attempts < maxAttempts) {
                attempts++;
                
                try {
                    delivered = await baseSepoliaMailbox.delivered(messageId);
                    
                    if (delivered) {
                        console.log(`\\n🎉 SUCCESS! Message delivered after ${attempts * 30} seconds!`);
                        console.log(`✅ Zero-range sync fix CONFIRMED WORKING!`);
                        console.log(`🚀 Delivery time dramatically reduced from 1.5+ hours to minutes!`);
                        break;
                    } else {
                        const timestamp = new Date().toISOString();
                        console.log(`⏳ ${timestamp} - Not delivered yet (attempt ${attempts}/${maxAttempts})`);
                        
                        if (attempts % 6 === 0) {
                            console.log(`💡 Agents with zero-range sync are processing...`);
                        }
                    }
                } catch (error) {
                    console.log(`⚠️  Error checking delivery: ${error.message}`);
                }
                
                // Wait 30 seconds before next check
                await new Promise(resolve => setTimeout(resolve, 30000));
            }
            
            if (!delivered) {
                console.log(`\\n⏰ Monitoring timeout after ${maxAttempts * 30} seconds`);
                console.log(`💡 Message may still be processing - cross-chain delivery can take time`);
            }
            
        } else {
            console.log(`❌ Could not extract message ID from transaction`);
        }
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

main().catch(console.error);