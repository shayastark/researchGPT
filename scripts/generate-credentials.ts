#!/usr/bin/env node

const crypto = require('crypto');

/**
 * Generate XMTP credentials for your agent
 * 
 * This script helps you generate the encryption key needed for XMTP.
 * The inboxId will be automatically derived from your wallet address.
 */

function generateEncryptionKey() {
  // Generate a 32-byte (64 hex character) encryption key
  const key = crypto.randomBytes(32);
  return key.toString('hex');
}

console.log('🔐 XMTP Credential Generator\n');
console.log('═'.repeat(60));
console.log('\nGenerated Credentials:\n');

const encryptionKey = generateEncryptionKey();

console.log('XMTP_DB_ENCRYPTION_KEY=' + encryptionKey);

console.log('\n' + '═'.repeat(60));
console.log('\n📋 Next Steps:\n');
console.log('1. Copy the encryption key above');
console.log('2. Add it to your .env file or Railway variables');
console.log('3. Make sure you also have:');
console.log('   - XMTP_WALLET_KEY (your wallet private key with 0x prefix)');
console.log('   - XMTP_ENV (dev or production)');
console.log('\n⚠️  IMPORTANT: Keep this encryption key secret and backed up!\n');
console.log('   If you lose the encryption key, you lose access to all messages.\n');
console.log('\n📝 Note: The inboxId will be automatically derived from your');
console.log('   wallet address when you first create the agent.\n');

console.log('Example .env format:\n');
console.log('XMTP_WALLET_KEY=0x1234...abcd');
console.log('XMTP_ENV=dev');
console.log(`XMTP_DB_ENCRYPTION_KEY=${encryptionKey}`);
console.log('');
