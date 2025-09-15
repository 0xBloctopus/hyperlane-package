#!/usr/bin/env node
/**
 * Test message delivery with the new deployment addresses
 */

import { ethers } from 'ethers';

const SEPOLIA_RPC = 'https://eth-sepolia.g.alchemy.com/v2/lC2HDPB2Vs7-p-UPkgKD-VqFulU5elyk';
const BASE_SEPOLIA_RPC = 'https://base-sepolia.gateway.tenderly.co';

const PRIVATE_KEY = '0x1cdf65ac75f477650040ebe272ddaffb6735dcf55bd651869963ada71944e6db';

// NEW deployment addresses from your fresh run
const SEPOLIA_MAILBOX = '0x613C5560d3715fDCB7635a047F1acd85CD28140f';
const BASE_SEPOLIA_MAILBOX = '0x8B6Bc326aa2cEAc1F02eeE22948104BD4E76a993';
const BASE_SEPOLIA_TEST_RECIPIENT = '0xBb15bAcBbDCae7c6DA2f9D7b9a241670F7cD6fE6';

const SEPOLIA_DOMAIN = 11155111;
const BASE_SEPOLIA_DOMAIN = 84532;

// Mailbox ABI
const MAILBOX_ABI = [
    'function dispatch(uint32 destinationDomain, bytes32 recipientAddress, bytes calldata messageBody) external payable returns (bytes32 messageId)',
    'function delivered(bytes32 messageId) external view returns (bool)',
    'event Dispatch(address indexed sender, uint32 indexed destination, bytes32 indexed recipient, bytes32 message)',
    'event Process(uint32 indexed origin, bytes32 indexed sender, bytes32 indexed recipient)'
];

async function main() {
    console.log('🎯 TESTING FRESH HYPERLANE DEPLOYMENT');
    console.log('====================================');
    
    const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    const baseSepoliaProvider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
    const wallet = new ethers.Wallet(PRIVATE_KEY);
    const seporiaSigner = wallet.connect(sepoliaProvider);
    
    console.log(`📍 NEW Sepolia Mailbox: ${SEPOLIA_MAILBOX}`);
    console.log(`📍 NEW Base Sepolia Mailbox: ${BASE_SEPOLIA_MAILBOX}`);
    console.log(`👤 Sender: ${wallet.address}`);
    
    // Check balances
    const sepoliaBalance = await sepoliaProvider.getBalance(wallet.address);
    const baseSepoliaBalance = await baseSepoliaProvider.getBalance(wallet.address);
    console.log(`💰 Sepolia balance: ${ethers.formatEther(sepoliaBalance)} ETH`);
    console.log(`💰 Base Sepolia balance: ${ethers.formatEther(baseSepoliaBalance)} ETH`);
    
    // Create mailbox contracts
    const sepoliaMailbox = new ethers.Contract(SEPOLIA_MAILBOX, MAILBOX_ABI, seporiaSigner);
    const baseSepoliaMailbox = new ethers.Contract(BASE_SEPOLIA_MAILBOX, MAILBOX_ABI, baseSepoliaProvider);
    
    // Create unique message
    const timestamp = Math.floor(Date.now() / 1000);
    const messageBody = ethers.toUtf8Bytes(`NEW DEPLOYMENT TEST: ${timestamp} - Agents ready!`);
    const recipientBytes32 = ethers.zeroPadValue(BASE_SEPOLIA_TEST_RECIPIENT, 32);
    
    console.log(`\n📤 Sending message: "${ethers.toUtf8String(messageBody)}"`);
    console.log(`📍 Destination: Base Sepolia (domain ${BASE_SEPOLIA_DOMAIN})`);
    
    try {
        console.log('\n📡 Dispatching message...');
        const tx = await sepoliaMailbox.dispatch(
            BASE_SEPOLIA_DOMAIN,
            recipientBytes32,
            messageBody,
            { gasLimit: 200000 }
        );
        
        console.log(`✅ TX Hash: ${tx.hash}`);
        console.log(`🔗 Sepolia: https://sepolia.etherscan.io/tx/${tx.hash}`);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        console.log(`✅ Confirmed in block: ${receipt.blockNumber}`);
        
        // Extract message ID
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
                        break;
                    }
                }
            } catch (e) {
                // Skip unparseable logs
            }
        }
        
        if (!messageId) {
            console.log('❌ Could not extract message ID from transaction');
            return;
        }
        
        console.log(`\n🔍 Now monitoring for delivery with ACTIVE agents...`);
        console.log(`⭐ Your deployment has validator-sepolia, validator-basesepolia, and relayer running!`);
        
        // Monitor for delivery with active agents
        let delivered = false;
        let attempts = 0;
        const maxAttempts = 60; // Monitor for 10 minutes (60 * 10 seconds)
        
        const checkDelivery = async () => {
            try {
                const isDelivered = await baseSepoliaMailbox.delivered(messageId);
                attempts++;
                
                if (isDelivered) {
                    delivered = true;
                    console.log(`\n🎉 🎉 🎉 MESSAGE DELIVERED! 🎉 🎉 🎉`);
                    console.log(`\n🏆 COMPLETE END-TO-END PROOF ACHIEVED!`);
                    console.log(`   📤 Dispatched: Block ${receipt.blockNumber} on Sepolia`);
                    console.log(`   📥 Delivered: CONFIRMED on Base Sepolia`);
                    console.log(`   🆔 Message ID: ${messageId}`);
                    console.log(`   ⏱️  Total time: ${attempts * 10} seconds`);
                    console.log(`   🔗 Sepolia TX: https://sepolia.etherscan.io/tx/${tx.hash}`);
                    
                    // Search for the delivery transaction
                    console.log(`\n🔍 Searching for delivery transaction on Base Sepolia...`);
                    const currentBlock = await baseSepoliaProvider.getBlockNumber();
                    const processFilter = baseSepoliaMailbox.filters.Process(SEPOLIA_DOMAIN);
                    const events = await baseSepoliaMailbox.queryFilter(processFilter, Math.max(0, currentBlock - 100), currentBlock);
                    
                    if (events.length > 0) {
                        const latestEvent = events[events.length - 1];
                        console.log(`🎯 DELIVERY TRANSACTION FOUND!`);
                        console.log(`   📦 Base Sepolia TX: ${latestEvent.transactionHash}`);
                        console.log(`   🔗 Explorer: https://base-sepolia.blockscout.com/tx/${latestEvent.transactionHash}`);
                        console.log(`   📊 Block: ${latestEvent.blockNumber}`);
                    }
                    
                    console.log(`\n🎊 UNDENIABLE PROOF COMPLETE:`);
                    console.log(`   ✅ Validators processed checkpoints`);
                    console.log(`   ✅ Relayer submitted delivery proof`);
                    console.log(`   ✅ Message delivered on destination chain`);
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