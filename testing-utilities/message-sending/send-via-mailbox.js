#!/usr/bin/env node
/**
 * Simplified message sender that focuses on getting the message ID
 */

import { ethers } from 'ethers';

const SEPOLIA_RPC = 'https://eth-sepolia.g.alchemy.com/v2/lC2HDPB2Vs7-p-UPkgKD-VqFulU5elyk';
const BASE_SEPOLIA_RPC = 'https://base-sepolia.gateway.tenderly.co';

const PRIVATE_KEY = '0x1cdf65ac75f477650040ebe272ddaffb6735dcf55bd651869963ada71944e6db';

const SEPOLIA_MAILBOX = '0xB1DD9ca81fe29377e70E72ab59C095d2B7052b9d';
const BASE_SEPOLIA_MAILBOX = '0x71101452d0efcbb75bb3E2D65401A3eAD2423643';
const BASE_SEPOLIA_TEST_RECIPIENT = '0x309D9EB90eEf23bbB886FDa51064d899DA00E42E';

const BASE_SEPOLIA_DOMAIN = 84532;

// Simple Mailbox ABI
const MAILBOX_ABI = [
    'function dispatch(uint32 destinationDomain, bytes32 recipientAddress, bytes calldata messageBody) external payable returns (bytes32 messageId)',
    'function delivered(bytes32 messageId) external view returns (bool)',
    'event Dispatch(address indexed sender, uint32 indexed destination, bytes32 indexed recipient, bytes32 message)'
];

async function main() {
    console.log('🚀 Sending test message via Mailbox...');
    
    // Setup providers and wallet
    const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    const baseSepoliaProvider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
    const wallet = new ethers.Wallet(PRIVATE_KEY);
    const seporiaSigner = wallet.connect(sepoliaProvider);
    
    console.log(`Sender: ${wallet.address}`);
    
    // Create mailbox contracts
    const sepoliaMailbox = new ethers.Contract(SEPOLIA_MAILBOX, MAILBOX_ABI, seporiaSigner);
    const baseSepoliaMailbox = new ethers.Contract(BASE_SEPOLIA_MAILBOX, MAILBOX_ABI, baseSepoliaProvider);
    
    // Create message
    const timestamp = Math.floor(Date.now() / 1000);
    const messageBody = ethers.toUtf8Bytes(`Test message ${timestamp}`);
    const recipientBytes32 = ethers.zeroPadValue(BASE_SEPOLIA_TEST_RECIPIENT, 32);
    
    console.log(`Message: "${ethers.toUtf8String(messageBody)}"`);
    
    try {
        // Send the message and get the message ID from the return value
        console.log('📡 Dispatching message...');
        const tx = await sepoliaMailbox.dispatch(
            BASE_SEPOLIA_DOMAIN,
            recipientBytes32,
            messageBody,
            { gasLimit: 200000 }
        );
        
        console.log(`✅ TX Hash: ${tx.hash}`);
        console.log(`🔗 Sepolia: https://sepolia.etherscan.io/tx/${tx.hash}`);
        
        // Wait for confirmation and get receipt
        const receipt = await tx.wait();
        console.log(`✅ Confirmed in block: ${receipt.blockNumber}`);
        
        // Parse logs to extract message ID
        let messageId = null;
        for (const log of receipt.logs) {
            try {
                if (log.address.toLowerCase() === SEPOLIA_MAILBOX.toLowerCase()) {
                    const parsed = sepoliaMailbox.interface.parseLog({
                        topics: log.topics,
                        data: log.data
                    });
                    
                    if (parsed && parsed.name === 'Dispatch') {
                        messageId = parsed.args.message;
                        console.log(`📨 Message ID: ${messageId}`);
                        console.log(`📤 Sender: ${parsed.args.sender}`);
                        console.log(`🎯 Destination: ${parsed.args.destination}`);
                        console.log(`📍 Recipient: ${parsed.args.recipient}`);
                        break;
                    }
                }
            } catch (e) {
                console.log(`Log parsing error: ${e.message}`);
            }
        }
        
        if (messageId) {
            console.log('\n🔍 Checking delivery status on Base Sepolia...');
            
            // Check if message is delivered
            try {
                const isDelivered = await baseSepoliaMailbox.delivered(messageId);
                console.log(`📦 Message delivered: ${isDelivered}`);
                
                if (isDelivered) {
                    console.log('\n🎉 SUCCESS! Message already delivered!');
                    console.log('✅ UNDENIABLE PROOF OF DELIVERY:');
                    console.log(`   📤 Sent on Sepolia: Block ${receipt.blockNumber} (TX: ${tx.hash})`);
                    console.log(`   📥 Confirmed delivered on Base Sepolia`);
                    console.log(`   🆔 Message ID: ${messageId}`);
                } else {
                    console.log('\n⏳ Message not yet delivered. This is normal - it takes time for validators to sign and relayer to process.');
                    console.log('💡 You can monitor the delivery by checking the delivered() function later.');
                }
            } catch (e) {
                console.log(`❌ Error checking delivery: ${e.message}`);
            }
        } else {
            console.log('❌ Could not extract message ID from transaction');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

main().catch(console.error);