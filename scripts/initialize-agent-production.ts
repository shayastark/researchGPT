#!/usr/bin/env node
/**
 * Initialize XMTP Agent on Production Network
 * 
 * This script creates an XMTP identity on the PRODUCTION network
 * so that users can message your agent via xmtp.chat
 */

import { Agent, validHex } from '@xmtp/agent-sdk';
import { createUser, createSigner } from '@xmtp/agent-sdk/user';
import dotenv from 'dotenv';

dotenv.config();

const XMTP_WALLET_KEY = process.env.XMTP_WALLET_KEY;
const XMTP_DB_ENCRYPTION_KEY = process.env.XMTP_DB_ENCRYPTION_KEY;

if (!XMTP_WALLET_KEY) {
  console.error('❌ Error: XMTP_WALLET_KEY environment variable is required');
  console.log('\nSet it in your .env file or Railway environment variables:');
  console.log('XMTP_WALLET_KEY=0x...');
  process.exit(1);
}

if (!XMTP_DB_ENCRYPTION_KEY) {
  console.error('❌ Error: XMTP_DB_ENCRYPTION_KEY environment variable is required');
  console.log('\nGenerate one using: npm run generate-credentials');
  process.exit(1);
}

async function initializeAgent() {
  console.log('🚀 Initializing XMTP Agent on PRODUCTION Network\n');
  console.log('⚠️  This will create an XMTP identity that users can message via xmtp.chat');
  console.log('⚠️  Make sure you have backed up your encryption key!\n');

  try {
    // Create signer from private key
    const user = createUser(validHex(XMTP_WALLET_KEY));
    const signer = createSigner(user);

    console.log('🔄 Creating agent on production network...');

    // Create agent on PRODUCTION network
    const agent = await Agent.create(signer, {
      env: 'production', // This is the key - must be production for xmtp.chat
      dbEncryptionKey: Buffer.from(XMTP_DB_ENCRYPTION_KEY!, 'hex'),
    });

    console.log('\n✅ SUCCESS! Agent initialized on PRODUCTION network\n');
    console.log('═'.repeat(60));
    console.log('📬 Agent Address:', agent.address);
    console.log('📊 InboxId:', agent.client.inboxId);
    console.log('🌐 Network: PRODUCTION');
    console.log('═'.repeat(60));
    console.log('\n✅ Users can now message this address on xmtp.chat!');
    console.log('✅ Update your Railway environment to use XMTP_ENV=production\n');

    // Don't start the agent, just initialize it
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed to initialize agent:', error);
    process.exit(1);
  }
}

initializeAgent();
