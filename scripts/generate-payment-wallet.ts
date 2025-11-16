#!/usr/bin/env node

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

/**
 * Generate a new Ethereum wallet for x402 payments
 * 
 * This wallet will be used to make USDC payments on Base blockchain
 */

console.log('💳 Payment Wallet Generator for x402\n');
console.log('═'.repeat(70));

// Generate a new private key
const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

console.log('\n🎉 New Payment Wallet Generated:\n');
console.log('Private Key (keep this secret!):');
console.log(privateKey);
console.log('\nWallet Address:');
console.log(account.address);

console.log('\n' + '═'.repeat(70));
console.log('\n📋 Next Steps:\n');
console.log('1. ⚠️  SECURELY SAVE the private key above');
console.log('   - Store it in a password manager');
console.log('   - NEVER commit it to git');
console.log('   - NEVER share it with anyone');
console.log('\n2. 💰 Fund the wallet address with:');
console.log('   - USDC on Base mainnet (~1-10 USDC for testing)');
console.log('   - ETH on Base mainnet (~0.001-0.01 ETH for gas)');
console.log('\n3. 🔧 Add to Railway environment variables:');
console.log(`   PAYMENT_PRIVATE_KEY=${privateKey}`);
console.log('\n4. 🚀 Deploy your agent!');

console.log('\n' + '═'.repeat(70));
console.log('\n💡 Funding Your Wallet:\n');
console.log('Option A: Bridge from Ethereum mainnet');
console.log('  - Visit https://bridge.base.org');
console.log('  - Send USDC and ETH to Base');
console.log('\nOption B: Use a centralized exchange');
console.log('  - Withdraw USDC to Base network');
console.log('  - Withdraw ETH to Base network');
console.log('  - Use the wallet address above as destination');
console.log('\nOption C: Use an on-ramp service');
console.log('  - Moonpay, Ramp, or similar');
console.log('  - Buy directly on Base network');

console.log('\n' + '═'.repeat(70));
console.log('\n📊 Cost Estimates:\n');
console.log('x402 API calls: ~0.10 USDC per call');
console.log('Gas fees on Base: ~0.0001 ETH per transaction');
console.log('\nFor 10 test queries:');
console.log('  USDC needed: ~1 USDC');
console.log('  ETH needed: ~0.001 ETH (~$3)');

console.log('\n' + '═'.repeat(70));
console.log('\n⚠️  SECURITY REMINDER:\n');
console.log('- This private key controls real funds');
console.log('- Only fund with amounts you are willing to spend');
console.log('- For production, use a dedicated wallet');
console.log('- Consider using a hardware wallet for large amounts');
console.log('');
