const { ethers } = require('ethers');

async function sendTestMessage() {
    const sepoliaProvider = new ethers.providers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/lC2HDPB2Vs7-p-UPkgKD-VqFulU5elyk');
    const privateKey = '0x1cdf65ac75f477650040ebe272ddaffb6735dcf55bd651869963ada71944e6db';
    const wallet = new ethers.Wallet(privateKey, sepoliaProvider);
    
    const mailboxAddress = '0xdfDECD5FC6606bd603F55CB677a244C415Ee6c5f';
    const mailboxABI = [
        "function dispatch(uint32 _destinationDomain, bytes32 _recipientAddress, bytes calldata _messageBody) external payable returns (bytes32)"
    ];
    
    const mailbox = new ethers.Contract(mailboxAddress, mailboxABI, wallet);
    
    const destinationDomain = 84532; // Base Sepolia
    const recipientAddress = '0x' + '0'.repeat(24) + 'e1A74e1FCB254CB1e5eb1245eaAe034A4D7dD538'; // Convert to bytes32
    const messageBody = ethers.utils.toUtf8Bytes(`Quick test at ${Date.now()}`);
    
    console.log(`📤 Sending message at ${new Date().toISOString()}...`);
    const tx = await mailbox.dispatch(destinationDomain, recipientAddress, messageBody);
    console.log(`✅ Transaction sent: ${tx.hash}`);
    console.log(`⏳ Waiting for confirmation...`);
    
    const receipt = await tx.wait();
    console.log(`✅ Message confirmed at ${new Date().toISOString()}`);
    console.log(`📦 Block: ${receipt.blockNumber}, Gas: ${receipt.gasUsed}`);
    
    return { txHash: tx.hash, blockNumber: receipt.blockNumber, timestamp: Date.now() };
}

sendTestMessage().catch(console.error);