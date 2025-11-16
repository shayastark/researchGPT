/**
 * x402 Bazaar Discovery Client
 * Fetches and filters available x402 services from the CDP Bazaar
 */

export interface X402ServiceAccept {
  asset: string; // ERC-20 token contract address
  description?: string;
  extra?: {
    name?: string;
    version?: string;
  };
  maxAmountRequired: string; // in atomic units (e.g., USDC has 6 decimals)
  maxTimeoutSeconds: number;
  mimeType?: string;
  network: string;
  outputSchema: {
    input: {
      method: string;
      type: string;
    };
    output: any;
  };
  payTo: string; // Address to send payment to
  resource: string; // API endpoint URL
  scheme: string; // 'exact', etc.
}

export interface X402Service {
  accepts: X402ServiceAccept[];
  lastUpdated: string;
  metadata?: Record<string, any>;
  resource: string;
  type: string;
  x402Version: number;
}

export interface X402BazaarResponse {
  items: X402Service[];
}

export interface DiscoveryFilter {
  maxPrice?: number; // Maximum price in atomic units
  network?: string; // e.g., 'base'
  asset?: string; // e.g., USDC contract address
  minTimeoutSeconds?: number;
}

export class X402BazaarClient {
  private readonly discoveryUrl = 'https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources';
  
  // USDC addresses
  static readonly USDC_BASE_MAINNET = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
  static readonly USDC_BASE_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

  constructor() {}

  /**
   * Fetch all available x402 services from the Bazaar
   */
  async list(): Promise<X402BazaarResponse> {
    console.log('🔍 Fetching services from x402 Bazaar...');
    
    try {
      const response = await fetch(this.discoveryUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Bazaar request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as X402BazaarResponse;
      console.log(`✅ Found ${data.items?.length || 0} services in Bazaar`);
      
      return data;
    } catch (error) {
      console.error('❌ Failed to fetch from Bazaar:', error);
      throw error;
    }
  }

  /**
   * Filter services based on criteria
   */
  filterServices(services: X402Service[], filter: DiscoveryFilter): X402Service[] {
    return services.filter(service => {
      return service.accepts.some(paymentReq => {
        // Check price
        if (filter.maxPrice !== undefined) {
          const price = Number(paymentReq.maxAmountRequired);
          if (price > filter.maxPrice) return false;
        }

        // Check network
        if (filter.network && paymentReq.network !== filter.network) {
          return false;
        }

        // Check asset
        if (filter.asset && paymentReq.asset.toLowerCase() !== filter.asset.toLowerCase()) {
          return false;
        }

        // Check timeout
        if (filter.minTimeoutSeconds && paymentReq.maxTimeoutSeconds < filter.minTimeoutSeconds) {
          return false;
        }

        return true;
      });
    });
  }

  /**
   * Discover affordable services under a specific price
   */
  async discoverAffordableServices(
    maxPriceUSDC: number, // in USDC (not atomic units)
    useMainnet: boolean = true
  ): Promise<X402Service[]> {
    const services = await this.list();
    
    // Convert USDC to atomic units (6 decimals)
    const maxPriceAtomic = Math.floor(maxPriceUSDC * 1_000_000);
    
    const usdcAddress = useMainnet 
      ? X402BazaarClient.USDC_BASE_MAINNET 
      : X402BazaarClient.USDC_BASE_SEPOLIA;

    const affordable = this.filterServices(services.items, {
      maxPrice: maxPriceAtomic,
      network: 'base',
      asset: usdcAddress,
    });

    console.log(`💰 Found ${affordable.length} services under $${maxPriceUSDC} USDC`);
    
    return affordable;
  }

  /**
   * Get a service's best payment option
   */
  getBestPaymentOption(service: X402Service, preferredAsset?: string): X402ServiceAccept | null {
    if (!service.accepts || service.accepts.length === 0) {
      return null;
    }

    // If preferred asset is specified, find it
    if (preferredAsset) {
      const preferred = service.accepts.find(
        accept => accept.asset.toLowerCase() === preferredAsset.toLowerCase()
      );
      if (preferred) return preferred;
    }

    // Otherwise return the cheapest option
    return service.accepts.reduce((cheapest, current) => {
      const cheapestPrice = Number(cheapest.maxAmountRequired);
      const currentPrice = Number(current.maxAmountRequired);
      return currentPrice < cheapestPrice ? current : cheapest;
    });
  }

  /**
   * Format price for display
   */
  formatPrice(atomicUnits: string, decimals: number = 6): string {
    const price = Number(atomicUnits) / Math.pow(10, decimals);
    return price.toFixed(decimals);
  }

  /**
   * Get service description for AI tool
   */
  getServiceDescription(service: X402Service, paymentOption: X402ServiceAccept): string {
    const price = this.formatPrice(paymentOption.maxAmountRequired, 6);
    const assetName = paymentOption.extra?.name || 'USDC';
    
    let description = `API endpoint: ${service.resource}`;
    description += ` | Price: $${price} ${assetName} on ${paymentOption.network}`;
    
    if (service.metadata && Object.keys(service.metadata).length > 0) {
      description += ` | ${JSON.stringify(service.metadata)}`;
    }
    
    return description;
  }
}
