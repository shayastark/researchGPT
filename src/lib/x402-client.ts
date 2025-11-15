import { wrapFetchWithPayment, decodeXPaymentResponse } from 'x402-fetch';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';

interface X402ClientConfig {
  rpcUrl: string;
  privateKey: string;
  network?: 'mainnet' | 'testnet';
}

interface X402Response {
  data: any;
  paymentResponse?: any;
}

/**
 * x402 Client for autonomous agent payments
 * Uses official x402-fetch to handle payment flow automatically
 */
export class X402Client {
  private account: any;
  private fetchWithPayment: typeof fetch;

  constructor(config: X402ClientConfig) {
    const isTestnet = config.network === 'testnet';
    const chain = isTestnet ? baseSepolia : base;

    // Create wallet account from private key
    this.account = privateKeyToAccount(config.privateKey as `0x${string}`);

    // Wrap fetch with x402 payment capabilities
    this.fetchWithPayment = wrapFetchWithPayment(fetch, this.account);

    console.log(`✅ x402 Client initialized`);
    console.log(`   Network: ${isTestnet ? 'Base Sepolia (testnet)' : 'Base (mainnet)'}`);
    console.log(`   Wallet: ${this.account.address}`);
  }

  /**
   * Make a request to an x402-enabled service
   * Automatically handles 402 responses and payment flow
   */
  async request(url: string, options: RequestInit = {}): Promise<X402Response> {
    try {
      console.log(`🔄 x402 request to ${url}`);

      // Make request - x402-fetch automatically handles payment if needed
      const response = await this.fetchWithPayment(url, {
        method: options.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: options.body,
      });

      // Parse response body
      const data = await response.json();

      // Decode payment response if present
      const paymentResponseHeader = response.headers.get('x-payment-response');
      const paymentResponse = paymentResponseHeader
        ? decodeXPaymentResponse(paymentResponseHeader)
        : undefined;

      if (paymentResponse) {
        console.log(`✅ Payment completed successfully`);
        console.log(`   Transaction: ${paymentResponse.transaction || 'pending'}`);
      }

      return {
        data,
        paymentResponse,
      };
    } catch (error: any) {
      console.error(`❌ x402 request failed:`, error.message);
      throw error;
    }
  }

  /**
   * Helper to make POST requests to x402 services
   */
  async post(url: string, body: any): Promise<X402Response> {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Helper to make GET requests to x402 services
   */
  async get(url: string): Promise<X402Response> {
    return this.request(url, {
      method: 'GET',
    });
  }

  /**
   * Get wallet address
   */
  getAddress(): string {
    return this.account.address;
  }
}
