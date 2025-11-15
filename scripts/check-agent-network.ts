#!/usr/bin/env node
/**
 * Check XMTP Agent Network Status
 * 
 * This script checks which XMTP network(s) your wallet address is registered on
 */

import { Agent, validHex } from '@xmtp/agent-sdk';
import { createUser, createSigner } from '@xmtp/agent-sdk/user';
import dotenv from 'dotenv';

dotenv.config();

const XMTP_WALLET_KEY = process.env.XMTP_WALLET_KEY;
const XMTP_DB_ENCRYPTION_KEY = process.env.XMTP_DB_ENCRYPTION_KEY;

if (!XMTP_WALLET_KEY) {
  console.error('❌ Error: XMTP_WALLET_KEY environment variable is required');
  process.exit(1);
}

if (!XMTP_DB_ENCRYPTION_KEY) {
  console.error('❌ Error: XMTP_DB_ENCRYPTION_KEY environment variable is required');
  process.exit(1);
}

async function checkNetwork(network: 'dev' | 'production') {
  try {
    const user = createUser(validHex(XMTP_WALLET_KEY));
    const signer = createSigner(user);

    console.log(`\n🔍 Checking ${network.toUpperCase()} network...`);

    const agent = await Agent.create(signer, {
      env: network,
      encryptionKey: Buffer.from(XMTP_DB_ENCRYPTION_KEY, 'hex'),
    });

    console.log(`✅ Agent exists on ${network.toUpperCase()} network`);
    console.log(`   Address: ${agent.address}`);
    console.log(`   InboxId: ${agent.client.inboxId}`);

    return true;
  } catch (error) {
    console.log(`❌ Agent NOT found on ${network.toUpperCase()} network`);
    return false;
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║         XMTP Agent Network Status Checker                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  const user = createUser(validHex(XMTP_WALLET_KEY));
  const address = user.account.address;
  
  console.log(`\n📬 Wallet Address: ${address}`);

  const onDev = await checkNetwork('dev');
  const onProduction = await checkNetwork('production');

  console.log('\n' + '═'.repeat(60));
  console.log('📊 Summary:');
  console.log('═'.repeat(60));
  console.log(`DEV Network:        ${onDev ? '✅ Registered' : '❌ Not registered'}`);
  console.log(`PRODUCTION Network: ${onProduction ? '✅ Registered' : '❌ Not registered'}`);
  console.log('═'.repeat(60));

  if (!onProduction) {
    console.log('\n⚠️  Your agent is NOT on the PRODUCTION network!');
    console.log('   Users on xmtp.chat cannot message you.');
    console.log('\n💡 To fix this, run:');
    console.log('   npm run initialize-production');
  } else {
    console.log('\n✅ Your agent is ready for xmtp.chat!');
    console.log('   Users can message: ' + address);
  }

  console.log('\n');
  process.exit(0);
}

main();
