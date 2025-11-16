/**
 * Check wallet balances for any address
 */

import { createPublicClient, http, formatUnits, type Address } from 'viem';
import { base, baseSepolia } from 'viem/chains';

// USDC addresses
const USDC_BASE_MAINNET = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDC_BASE_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

// ERC20 balanceOf ABI
const balanceOfAbi = [{
  name: 'balanceOf',
  type: 'function',
  stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }],
  outputs: [{ name: '', type: 'uint256' }]
}] as const;

async function checkBalances(walletAddress: string, useMainnet: boolean = true) {
  const chain = useMainnet ? base : baseSepolia;
  const usdcAddress = useMainnet ? USDC_BASE_MAINNET : USDC_BASE_SEPOLIA;
  const rpcUrl = useMainnet ? 'https://mainnet.base.org' : 'https://sepolia.base.org';
  
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  console.log(`\n${'='.repeat(80)}`);
  console.log('💰 WALLET BALANCE CHECK');
  console.log('='.repeat(80));
  console.log(`Wallet Address: ${walletAddress}`);
  console.log(`Network: ${useMainnet ? 'Base Mainnet' : 'Base Sepolia'}`);
  console.log(`RPC: ${rpcUrl}`);
  console.log('='.repeat(80));

  try {
    // Check ETH balance (for gas)
    console.log('\n📊 Checking ETH balance (needed for gas fees)...');
    const ethBalance = await publicClient.getBalance({
      address: walletAddress as Address,
    });
    const ethFormatted = formatUnits(ethBalance, 18);
    console.log(`   ETH Balance: ${ethFormatted} ETH`);
    console.log(`   ETH Balance (wei): ${ethBalance.toString()}`);
    
    if (parseFloat(ethFormatted) < 0.0001) {
      console.log('   ⚠️  WARNING: Low/Zero ETH balance! You need ETH to pay for gas fees.');
      console.log('   💡 Fund your wallet with at least 0.001 ETH on Base');
    } else {
      console.log('   ✅ ETH balance looks good');
    }

    // Check USDC balance (for payments)
    console.log('\n📊 Checking USDC balance (needed for service payments)...');
    const usdcBalance = await publicClient.readContract({
      address: usdcAddress as Address,
      abi: balanceOfAbi,
      functionName: 'balanceOf',
      args: [walletAddress as Address],
    });
    
    const usdcFormatted = formatUnits(usdcBalance, 6);
    console.log(`   USDC Balance: ${usdcFormatted} USDC`);
    console.log(`   USDC Balance (atomic units): ${usdcBalance.toString()}`);
    console.log(`   USDC Contract: ${usdcAddress}`);
    
    if (parseFloat(usdcFormatted) < 0.01) {
      console.log('   ⚠️  WARNING: Insufficient USDC balance! You need USDC to pay for services.');
      console.log('   💡 The service costs 0.01 USDC (10000 atomic units)');
      console.log(`   💡 Current balance: ${usdcBalance.toString()} atomic units`);
      console.log(`   💡 Shortfall: ${10000 - Number(usdcBalance)} atomic units`);
    } else {
      console.log('   ✅ USDC balance looks good');
    }

    // Calculate how many 0.01 USDC calls can be made
    const callsAvailable = Math.floor(parseFloat(usdcFormatted) / 0.01);
    console.log(`\n💡 You can make approximately ${callsAvailable} calls at $0.01 USDC each`);

    // Summary
    console.log(`\n${'='.repeat(80)}`);
    console.log('📝 SUMMARY');
    console.log('='.repeat(80));
    
    const hasEnoughEth = parseFloat(ethFormatted) >= 0.0001;
    const hasEnoughUsdc = parseFloat(usdcFormatted) >= 0.01;
    
    if (hasEnoughEth && hasEnoughUsdc) {
      console.log('✅ Your wallet is funded and ready to make x402 payments!');
    } else {
      console.log('❌ Your wallet needs funding:');
      if (!hasEnoughEth) {
        console.log(`   • Fund with ETH for gas fees`);
        console.log(`     Current: ${ethFormatted} ETH`);
        console.log(`     Needed: At least 0.001 ETH (recommended)`);
      }
      if (!hasEnoughUsdc) {
        console.log(`   • Fund with USDC for service payments`);
        console.log(`     Current: ${usdcFormatted} USDC (${usdcBalance.toString()} atomic units)`);
        console.log(`     Needed: At least 0.01 USDC (10000 atomic units) for one payment`);
        console.log(`     Recommended: 0.1 USDC (100000 atomic units) for testing`);
      }
      console.log(`\n💡 Send funds to: ${walletAddress}`);
      console.log(`   Network: ${useMainnet ? 'Base Mainnet' : 'Base Sepolia'}`);
      console.log(`   USDC Contract: ${usdcAddress}`);
    }
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Error checking balances:', error);
    if (error instanceof Error) {
      console.error('   Error details:', error.message);
    }
    process.exit(1);
  }
}

// Get address from command line or use the one from the error logs
const walletAddress = process.argv[2] || '0x7A53b92d25e652Ccb1e3Ff0194399d7a21528fbE';
const useMainnet = process.argv[3] !== 'sepolia';

checkBalances(walletAddress, useMainnet);
