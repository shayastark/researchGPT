/**
 * x402 Official Client
 * Uses the official x402-fetch package for proper payment flow
 */

import { wrapFetchWithPayment, decodeXPaymentResponse } from 'x402-fetch';
import { createWalletClient, createPublicClient, http, formatUnits, type Address } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import type { Account } from 'viem';

export interface X402OfficialClientConfig {
  privateKey: `0x${string}`;
  rpcUrl: string;
  useMainnet: boolean;
}

export class X402OfficialClient {
  private account: Account;
  private chain: any;
  private fetchWithPayment: typeof fetch;
  private publicClient: any;

  // ERC20 balanceOf ABI
  private readonly balanceOfAbi = [{
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  }] as const;

  constructor(config: X402OfficialClientConfig) {
    this.account = privateKeyToAccount(config.privateKey);
    this.chain = config.useMainnet ? base : baseSepolia;
    
    // Create public client for balance checking
    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(config.rpcUrl),
    });

    // Wrap fetch with automatic x402 payment handling
    this.fetchWithPayment = wrapFetchWithPayment(fetch, this.account);
  }

  /**
   * Call an x402 endpoint - automatically handles 402 payment flow
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

    // Build final URL with query params
    let finalUrl = url;
    if (queryParams) {
      const params = new URLSearchParams(queryParams);
      finalUrl = `${url}${url.includes('?') ? '&' : '?'}${params.toString()}`;
    }

    console.log(`   📡 Calling x402 endpoint: ${finalUrl}`);
    console.log(`   🔧 Using official x402-fetch (automatic payment handling)`);

    try {
      // The official x402-fetch handles everything:
      // 1. Makes initial request
      // 2. If 402, parses payment requirements
      // 3. Creates and submits payment
      // 4. Waits for confirmation
      // 5. Retries with X-PAYMENT header
      const response = await this.fetchWithPayment(finalUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
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

      // Parse response
      const rawData = await response.json();

      // Get payment response details if available
      const paymentResponseHeader = response.headers.get('x-payment-response');
      if (paymentResponseHeader) {
        try {
          const paymentResponse = decodeXPaymentResponse(paymentResponseHeader);
          console.log(`   ✅ Payment completed:`, {
            success: paymentResponse.success,
            transaction: paymentResponse.transaction,
            network: paymentResponse.network,
            payer: paymentResponse.payer,
          });
        } catch (e) {
          // Payment response parsing failed, but request succeeded
          console.log(`   ✅ Payment completed (details unavailable)`);
        }
      }

      // Log the response structure for debugging
      console.log(`   📊 Response structure:`, {
        type: typeof rawData,
        isArray: Array.isArray(rawData),
        keys: typeof rawData === 'object' && rawData !== null ? Object.keys(rawData) : 'N/A',
        sample: typeof rawData === 'object' && rawData !== null 
          ? JSON.stringify(rawData).substring(0, 500) 
          : String(rawData).substring(0, 500),
      });
      
      // Log the FULL response for debugging (truncated if too long)
      const fullResponseStr = JSON.stringify(rawData, null, 2);
      if (fullResponseStr.length > 2000) {
        console.log(`   📋 Full response (truncated):`, fullResponseStr.substring(0, 2000) + '...');
      } else {
        console.log(`   📋 Full response:`, fullResponseStr);
      }

      // Extract actual data from common response structures
      // Many APIs wrap data in fields like 'data', 'result', 'content', 'items', etc.
      let extractedData: any = rawData;
      
      if (typeof rawData === 'object' && rawData !== null && !Array.isArray(rawData)) {
        const rawDataObj = rawData as Record<string, any>;
        
        // Check if this looks like a payment confirmation response (has success, payer, USDC_tx, etc.)
        const isPaymentConfirmation = rawDataObj.success !== undefined && 
                                     (rawDataObj.payer !== undefined || rawDataObj.USDC_tx !== undefined);
        
        if (isPaymentConfirmation) {
          console.log(`   ⚠️  Response appears to be payment confirmation only, checking for data fields...`);
          
          // Some APIs return payment info + data in the same response
          // Priority order for data extraction
          const dataFields = ['data', 'result', 'content', 'items', 'results', 'response', 'body', 'weather', 'forecast', 'info'];
          
          for (const field of dataFields) {
            if (rawDataObj[field] !== undefined && rawDataObj[field] !== null) {
              console.log(`   🔍 Found data in '${field}' field, extracting...`);
              extractedData = rawDataObj[field];
              break;
            }
          }
          
          // If we didn't find a data field, this might be a payment-only response
          // Check if there are any other fields that might contain actual data
          if (extractedData === rawData) {
            const allKeys = Object.keys(rawDataObj);
            // Comprehensive list of payment-related fields to exclude
            const paymentKeys = [
              'success', 'payer', 'USDC_tx', 'network', 'timestamp', 'transaction', 'hash',
              'tx', 'tx_hash', 'txhash', 'payment', 'payment_hash', 'payment_tx',
              'transaction_hash', 'txn', 'txid', 'nonce', 'amount', 'receiver',
              'payto', 'pay_to', 'asset', 'currency', 'token', 'usdc'
            ];
            const potentialDataKeys = allKeys.filter(key => {
              const keyLower = key.toLowerCase();
              // Exclude payment keys (case-insensitive)
              if (paymentKeys.some(pk => keyLower === pk.toLowerCase() || keyLower.includes(pk.toLowerCase()))) {
                return false;
              }
              // Exclude fields that are clearly payment-related
              if (keyLower.includes('tx') || keyLower.includes('hash') || keyLower.includes('payment')) {
                return false;
              }
              return true;
            });
            
            if (potentialDataKeys.length > 0) {
              console.log(`   🔍 Found potential data fields: ${potentialDataKeys.join(', ')}`);
              // Try to extract from the first non-payment field
              extractedData = rawDataObj[potentialDataKeys[0]];
              console.log(`   🔍 Extracting from '${potentialDataKeys[0]}' field`);
            } else {
              console.log(`   ⚠️  WARNING: Response contains only payment confirmation, no data fields found!`);
              console.log(`   ⚠️  This API may not be returning the actual data. Response keys: ${allKeys.join(', ')}`);
              console.log(`   ⚠️  The API appears to be broken or not implemented correctly.`);
              
              // Return a structured error response instead of payment confirmation
              extractedData = {
                error: true,
                message: 'API returned only payment confirmation, no actual data',
                payment_confirmed: true,
                transaction: rawDataObj.USDC_tx || rawDataObj.transaction || rawDataObj.hash,
                api_endpoint: finalUrl,
                response_keys: allKeys,
                note: 'This service may not be returning data correctly. Payment was successful but no data was provided.'
              };
            }
          }
        } else {
          // Normal response structure - look for common data fields
          const dataFields = ['data', 'result', 'content', 'items', 'results', 'response', 'body'];
          
          for (const field of dataFields) {
            if (rawDataObj[field] !== undefined && rawDataObj[field] !== null) {
              console.log(`   🔍 Extracting data from '${field}' field`);
              extractedData = rawDataObj[field];
              break;
            }
          }
        }
        
        // If we found data in a nested field, log what we're extracting vs what we're ignoring
        if (extractedData !== rawData) {
          const ignoredKeys = Object.keys(rawDataObj).filter(key => {
            const dataFields = ['data', 'result', 'content', 'items', 'results', 'response', 'body', 'weather', 'forecast', 'info'];
            return !dataFields.includes(key);
          });
          if (ignoredKeys.length > 0) {
            console.log(`   ℹ️  Ignoring metadata fields: ${ignoredKeys.join(', ')}`);
          }
        }
      }

      console.log(`   ✅ Data received successfully`);
      return extractedData;

    } catch (error) {
      console.error(`   ❌ x402 request failed:`, error);
      throw new Error(`x402 call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if wallet has sufficient balances for payments
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
