/**
 * x402 Payment Client
 * Handles the x402 payment protocol flow for calling paid endpoints
 */

import { createWalletClient, createPublicClient, http, parseUnits, formatUnits, type Address } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import type { X402ServiceAccept } from './x402-bazaar-discovery.js';

export interface X402PaymentInfo {
  accepts: Array<{
    type: 'erc20' | 'erc1155';
    quantity: string;
    address: Address;
    receiver: Address;
    chainId: number;
  }>;
  nonce: string;
}

export interface X402ClientConfig {
  privateKey: `0x${string}`;
  rpcUrl: string;
  useMainnet: boolean;
}

export class X402Client {
  private walletClient: any;
  private publicClient: any;
  private account: any;
  private chain: any;

  // ERC20 balanceOf ABI
  private readonly balanceOfAbi = [{
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  }] as const;

  constructor(config: X402ClientConfig) {
    this.account = privateKeyToAccount(config.privateKey);
    this.chain = config.useMainnet ? base : baseSepolia;
    
    this.walletClient = createWalletClient({
      account: this.account,
      chain: this.chain,
      transport: http(config.rpcUrl),
    });

    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(config.rpcUrl),
    });
  }

  /**
   * Call an x402 endpoint with automatic payment handling (using 402 response)
   */
  async callEndpoint(
    url: string,
    options: {
      method: 'GET' | 'POST';
      body?: any;
      queryParams?: Record<string, string>;
    }
  ): Promise<any> {
    const { method, body, queryParams } = options;

    // Build final URL with query params for GET requests
    let finalUrl = url;
    if (method === 'GET' && queryParams) {
      const params = new URLSearchParams(queryParams);
      finalUrl = `${url}?${params.toString()}`;
    }

    // Step 1: Initial request without payment
    console.log(`   📡 Initial request to: ${finalUrl}`);
    
    let response = await fetch(finalUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      ...(method === 'POST' && body ? { body: JSON.stringify(body) } : {}),
    });

    // Step 2: Handle 402 Payment Required
    if (response.status === 402) {
      console.log(`   💳 Payment required (402 response)`);
      
      // Get payment info from response
      const paymentInfo = await response.json() as X402PaymentInfo;
      console.log(`   📋 Payment details:`, JSON.stringify(paymentInfo, null, 2));

      if (!paymentInfo.accepts || paymentInfo.accepts.length === 0) {
        throw new Error('No payment options available in 402 response');
      }

      // Use the first payment option (USDC ERC20)
      const payment = paymentInfo.accepts[0];
      
      if (payment.type !== 'erc20') {
        throw new Error(`Unsupported payment type: ${payment.type}`);
      }

      // Step 3: Make payment on-chain
      console.log(`   💰 Sending ${payment.quantity} USDC payment to ${payment.receiver}`);
      
      try {
        // ERC20 transfer ABI
        const transferAbi = [{
          name: 'transfer',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }]
        }] as const;

        // Parse amount (payment.quantity is in smallest units, e.g., "100000" for 0.1 USDC)
        const amount = BigInt(payment.quantity);

        // Send USDC transfer transaction
        const hash = await this.walletClient.writeContract({
          address: payment.address as Address,
          abi: transferAbi,
          functionName: 'transfer',
          args: [payment.receiver, amount],
        });

        console.log(`   ✅ Payment transaction sent: ${hash}`);
        console.log(`   ⏳ Waiting for confirmation...`);

        // Wait for transaction confirmation
        // Note: In production, you might want to wait for multiple confirmations
        await this.waitForTransaction(hash);

        console.log(`   ✅ Payment confirmed on-chain`);

        // Step 4: Retry request with payment proof
        console.log(`   🔄 Retrying request with payment proof`);
        
        response = await fetch(finalUrl, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Payment-Hash': hash,
            'X-Payment-Nonce': paymentInfo.nonce,
          },
          ...(method === 'POST' && body ? { body: JSON.stringify(body) } : {}),
        });

        if (!response.ok) {
          throw new Error(`Request failed after payment: ${response.status} ${response.statusText}`);
        }

      } catch (paymentError) {
        console.error(`   ❌ Payment failed:`, paymentError);
        throw new Error(`Payment failed: ${paymentError instanceof Error ? paymentError.message : 'Unknown error'}`);
      }
    }

    // Step 5: Handle response
    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = 'Unable to read error response';
      }
      
      throw new Error(`Request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Return the data
    const data = await response.json();
    console.log(`   ✅ Data received successfully`);
    
    return data;
  }

  /**
   * Wait for transaction confirmation
   */
  private async waitForTransaction(hash: `0x${string}`): Promise<void> {
    const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max wait
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const receipt = await this.walletClient.getTransactionReceipt({ hash });
        if (receipt && receipt.status === 'success') {
          return;
        }
        if (receipt && receipt.status === 'reverted') {
          throw new Error('Transaction reverted');
        }
      } catch (error) {
        // Transaction not yet mined, continue waiting
      }

      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      attempts++;
    }

    throw new Error('Transaction confirmation timeout');
  }

  /**
   * Call an x402 endpoint using Bazaar discovery payment info (pre-payment)
   * This allows us to pay upfront using the discovered payment requirements
   */
  async callWithPaymentInfo(
    url: string,
    paymentInfo: X402ServiceAccept,
    options: {
      method: 'GET' | 'POST';
      body?: any;
      queryParams?: Record<string, string>;
    }
  ): Promise<any> {
    const { method, body, queryParams } = options;

    // Build final URL with query params
    let finalUrl = url;
    if (queryParams) {
      const params = new URLSearchParams(queryParams);
      finalUrl = `${url}${url.includes('?') ? '&' : '?'}${params.toString()}`;
    }

    console.log(`   💰 Paying upfront using Bazaar payment info:`);
    console.log(`      Endpoint: ${finalUrl}`);
    console.log(`      Amount: ${paymentInfo.maxAmountRequired} (${paymentInfo.extra?.name || 'USDC'})`);
    console.log(`      Pay to: ${paymentInfo.payTo}`);

    try {
      // Parse amount
      const amount = BigInt(paymentInfo.maxAmountRequired);
      
      // Check balances before attempting payment
      console.log(`   🔍 Checking wallet balances...`);
      const balanceCheck = await this.checkBalances(paymentInfo.asset as Address, amount);
      
      if (!balanceCheck.hasEnoughToken || !balanceCheck.hasEnoughEth) {
        const ethFormatted = formatUnits(balanceCheck.ethBalance, 18);
        const usdcFormatted = formatUnits(balanceCheck.tokenBalance, 6);
        const amountFormatted = formatUnits(amount, 6);
        
        console.error(`   ❌ Insufficient funds:`);
        console.error(`      ETH Balance: ${ethFormatted} ETH (need: ~0.001 ETH for gas)`);
        console.error(`      USDC Balance: ${usdcFormatted} USDC (need: ${amountFormatted} USDC)`);
        console.error(`      Wallet: ${this.account.address}`);
        
        throw new Error(balanceCheck.errorMessage || 'Insufficient funds');
      }
      
      console.log(`   ✅ Wallet has sufficient funds`);
      console.log(`      ETH: ${formatUnits(balanceCheck.ethBalance, 18)} ETH`);
      console.log(`      USDC: ${formatUnits(balanceCheck.tokenBalance, 6)} USDC`);

      // ERC20 transfer ABI
      const transferAbi = [{
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ name: '', type: 'bool' }]
      }] as const;

      // Send USDC transfer transaction
      const hash = await this.walletClient.writeContract({
        address: paymentInfo.asset as Address,
        abi: transferAbi,
        functionName: 'transfer',
        args: [paymentInfo.payTo as Address, amount],
      });

      console.log(`   ✅ Payment transaction sent: ${hash}`);
      console.log(`   ⏳ Waiting for confirmation...`);

      // Wait for transaction confirmation
      await this.waitForTransaction(hash);

      console.log(`   ✅ Payment confirmed on-chain`);

      // Make the actual API request
      console.log(`   🔄 Making authenticated request`);
      
      const response = await fetch(finalUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Payment-Hash': hash,
        },
        ...(method === 'POST' && body ? { body: JSON.stringify(body) } : {}),
      });

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = 'Unable to read error response';
        }
        throw new Error(`Request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // Return the data
      const data = await response.json();
      console.log(`   ✅ Data received successfully`);
      
      return data;

    } catch (error) {
      console.error(`   ❌ Payment or request failed:`, error);
      throw new Error(`x402 call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if wallet has sufficient balances for a payment
   */
  async checkBalances(tokenAddress: Address, amount: bigint): Promise<{
    hasEnoughToken: boolean;
    hasEnoughEth: boolean;
    ethBalance: bigint;
    tokenBalance: bigint;
    errorMessage?: string;
  }> {
    try {
      // Check ETH balance
      const ethBalance = await this.publicClient.getBalance({
        address: this.account.address as Address,
      });

      // Check token balance
      const tokenBalance = await this.publicClient.readContract({
        address: tokenAddress,
        abi: this.balanceOfAbi,
        functionName: 'balanceOf',
        args: [this.account.address as Address],
      });

      const hasEnoughToken = tokenBalance >= amount;
      const hasEnoughEth = ethBalance > 0n; // Need at least some ETH for gas

      let errorMessage: string | undefined;
      if (!hasEnoughToken || !hasEnoughEth) {
        const parts: string[] = [];
        
        if (!hasEnoughEth) {
          parts.push(`No ETH for gas fees (have: ${formatUnits(ethBalance, 18)} ETH, need: at least 0.001 ETH)`);
        }
        
        if (!hasEnoughToken) {
          // Assume USDC (6 decimals) for display
          const tokenRequired = formatUnits(amount, 6);
          const tokenHave = formatUnits(tokenBalance, 6);
          parts.push(`Insufficient USDC (have: ${tokenHave} USDC, need: ${tokenRequired} USDC)`);
        }

        errorMessage = `Wallet funding required: ${parts.join(' AND ')}. Please fund wallet ${this.account.address}`;
      }

      return {
        hasEnoughToken,
        hasEnoughEth,
        ethBalance,
        tokenBalance,
        errorMessage,
      };
    } catch (error) {
      console.error('Error checking balances:', error);
      throw new Error(`Failed to check wallet balances: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get account address
   */
  getAddress(): Address {
    return this.account.address;
  }
}
