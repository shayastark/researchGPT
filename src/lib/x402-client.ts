import { createPublicClient, createWalletClient, http, parseUnits, Address } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import axios from 'axios';

// ERC-20 ABI for USDC transfers
const ERC20_ABI = [
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

interface X402Config {
  rpcUrl: string;
  privateKey: string;
  usdcAddress: string;
}

interface X402PaymentInfo {
  amount: string; // USDC amount in human-readable format (e.g., "0.10")
  recipient: string; // Service's payment address
  nonce: string; // Unique payment identifier
}

export class X402Client {
  private publicClient: any;
  private walletClient: any;
  private account: any;
  private usdcAddress: Address;

  constructor(config: X402Config) {
    this.account = privateKeyToAccount(config.privateKey as `0x${string}`);

    this.publicClient = createPublicClient({
      chain: base,
      transport: http(config.rpcUrl),
    });

    this.walletClient = createWalletClient({
      account: this.account,
      chain: base,
      transport: http(config.rpcUrl),
    });

    this.usdcAddress = config.usdcAddress as Address;
  }

  /**
   * Make a request to an x402-enabled service
   * 1. Get payment info from service (402 Payment Required)
   * 2. Pay with USDC on Base
   * 3. Retry request with payment proof
   */
  async request(serviceUrl: string, endpoint: string, data: any): Promise<any> {
    console.log(`🔄 x402 request to ${serviceUrl}${endpoint}`);

    // Step 1: Initial request (will get 402 response with payment info)
    let response;
    try {
      response = await axios.post(`${serviceUrl}${endpoint}`, data);
      // If no 402, service might be free or already paid
      return response.data;
    } catch (error: any) {
      if (error.response?.status !== 402) {
        throw new Error(`Service error: ${error.message}`);
      }

      // Step 2: Extract payment info from 402 response
      const paymentInfo: X402PaymentInfo = error.response.data;
      console.log(`💳 Payment required: ${paymentInfo.amount} USDC to ${paymentInfo.recipient}`);

      // Step 3: Execute payment on Base
      const txHash = await this.payUSDC(
        paymentInfo.recipient as Address,
        paymentInfo.amount
      );
      console.log(`✅ Payment sent: ${txHash}`);

      // Step 4: Retry request with payment proof
      response = await axios.post(
        `${serviceUrl}${endpoint}`,
        data,
        {
          headers: {
            'X-Payment-Hash': txHash,
            'X-Payment-Nonce': paymentInfo.nonce,
          },
        }
      );

      return response.data;
    }
  }

  /**
   * Send USDC payment on Base
   */
  private async payUSDC(to: Address, amount: string): Promise<string> {
    // Convert human-readable amount to USDC units (6 decimals)
    const amountInUnits = parseUnits(amount, 6);

    // Check balance first
    const balance = await this.publicClient.readContract({
      address: this.usdcAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [this.account.address],
    });

    if (balance < amountInUnits) {
      throw new Error(`Insufficient USDC balance. Have: ${balance}, Need: ${amountInUnits}`);
    }

    // Execute transfer
    const hash = await this.walletClient.writeContract({
      address: this.usdcAddress,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [to, amountInUnits],
    });

    // Wait for confirmation
    await this.publicClient.waitForTransactionReceipt({ hash });

    return hash;
  }

  /**
   * Get current USDC balance
   */
  async getBalance(): Promise<string> {
    const balance = await this.publicClient.readContract({
      address: this.usdcAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [this.account.address],
    });

    // Convert to human-readable format
    return (Number(balance) / 1_000_000).toFixed(2);
  }
}
