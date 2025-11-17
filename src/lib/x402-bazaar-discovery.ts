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
      discoverable?: boolean;
      queryParams?: Record<string, {
        description?: string;
        required?: boolean;
        type?: string;
      }>;
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
   * Creates a human-readable description that helps the AI understand what the service does
   */
  getServiceDescription(service: X402Service, paymentOption: X402ServiceAccept): string {
    const price = this.formatPrice(paymentOption.maxAmountRequired, 6);
    const assetName = paymentOption.extra?.name || 'USDC';
    
    // Try to infer functionality from URL and metadata
    const inferredFunction = this.inferServiceFunction(service);
    
    let description = inferredFunction;
    description += ` | Cost: $${price} ${assetName}`;
    
    // Add metadata if available and useful
    if (service.metadata && Object.keys(service.metadata).length > 0) {
      const metadataStr = this.formatMetadata(service.metadata);
      if (metadataStr) {
        description += ` | ${metadataStr}`;
      }
    }
    
    // Add endpoint for reference
    description += ` | Endpoint: ${service.resource}`;
    
    return description;
  }

  /**
   * Infer what a service does from its URL, path, and metadata
   */
  private inferServiceFunction(service: X402Service): string {
    const url = service.resource.toLowerCase();
    const path = new URL(service.resource).pathname.toLowerCase();
    const pathSegments = path.split('/').filter(s => s && s !== 'api' && s !== 'x402');
    
    // Check metadata first
    if (service.metadata) {
      const metadata = service.metadata;
      if (metadata.name) return metadata.name;
      if (metadata.description) return metadata.description;
      if (metadata.title) return metadata.title;
    }
    
    // Extract specific keywords from path for more nuanced descriptions
    const hasCurrent = /current|latest|now|real.?time/i.test(path);
    const hasBias = /bias|optimized|optimize/i.test(path);
    const hasSentiment = /sentiment|feeling|mood/i.test(path);
    const hasArbitrage = /arbitrage|arb/i.test(path);
    
    // Infer from URL patterns
    // Order matters - more specific patterns should come first
    const patterns: Array<[RegExp, string]> = [
      // Crypto/blockchain specific (check first to avoid false matches)
      [/news.*base|base.*news|feed.*base|base.*feed/i, 'Get crypto/blockchain news and updates (Base ecosystem)'],
      [/news.*(?:crypto|blockchain|defi|token|nft)/i, 'Get crypto/blockchain news and updates'],
      
      // Trading signals - specific types first
      [/signal.*current|current.*signal/i, hasCurrent ? 'Get current/latest trading signals (crypto/blockchain)' : 'Get current trading signals (crypto/blockchain)'],
      [/signal.*bias|bias.*signal|bias.*optimized/i, hasBias ? 'Get bias-optimized trading signals (crypto/blockchain)' : 'Get optimized trading signals (crypto/blockchain)'],
      [/signal.*sentiment|sentiment.*signal/i, hasSentiment ? 'Get sentiment-based trading signals (crypto/blockchain)' : 'Get sentiment trading signals (crypto/blockchain)'],
      [/arbitrage|arb.*opportun/i, hasArbitrage ? 'Find arbitrage opportunities (crypto/blockchain)' : 'Find arbitrage opportunities (crypto/blockchain)'],
      
      // Generic trading signals (check after specific ones)
      [/signal|sentiment|analysis|trading/i, 'Get trading signals, market sentiment, or financial analysis (crypto/blockchain)'],
      
      [/wallet|reputation|address/i, 'Get wallet information or reputation (crypto/blockchain)'],
      [/mint|nft|token/i, 'Mint tokens or NFTs (crypto/blockchain)'],
      [/kalshi|prediction|market/i, 'Get prediction market data or categories (crypto/blockchain)'],
      
      // General services
      [/weather|forecast|climate/i, 'Get weather information and forecasts for locations'],
      [/image|generate|create|picture|photo/i, 'Generate or process images'],
      [/video|sora|create.*video/i, 'Generate or create videos'],
      [/search|query|find|lookup/i, 'Search for information or data'],
      [/qr.*code|qrcode/i, 'Generate QR codes'],
      [/email.*valid|validate.*email/i, 'Validate email addresses'],
      [/gif|animated/i, 'Search or generate GIFs'],
      [/twitter|tweet|social/i, 'Get Twitter/X social media data or insights'],
      [/convert|transform/i, 'Convert or transform data'],
      [/crawl|scrape|extract/i, 'Crawl, scrape, or extract data from URLs'],
      [/wait|delay|sleep/i, 'Wait or delay execution'],
      [/script|code|generate/i, 'Generate scripts or code'],
      [/health|ping|status/i, 'Check service health or status'],
      [/roadmap|plan/i, 'Get roadmap or planning information'],
      
      // Generic news (check last, might be crypto-specific)
      [/news|feed|articles/i, 'Get news articles (may be domain-specific)'],
    ];
    
    for (const [pattern, description] of patterns) {
      if (pattern.test(url) || pattern.test(path)) {
        // For signal services, enhance description with path context
        if (description.includes('trading signals') && pathSegments.length > 0) {
          const lastSegment = pathSegments[pathSegments.length - 1];
          if (lastSegment.includes('current') || lastSegment.includes('latest')) {
            return 'Get current/latest trading signals (crypto/blockchain)';
          } else if (lastSegment.includes('bias') || lastSegment.includes('optimized')) {
            return 'Get bias-optimized trading signals (crypto/blockchain)';
          } else if (lastSegment.includes('sentiment')) {
            return 'Get sentiment-based trading signals (crypto/blockchain)';
          }
        }
        return description;
      }
    }
    
    // Try to infer from path segments
    if (pathSegments.length > 0) {
      const lastSegment = pathSegments[pathSegments.length - 1];
      // Convert snake_case or kebab-case to readable
      const readable = lastSegment
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      return `Access ${readable} service`;
    }
    
    // Fallback
    return `Access API service at ${new URL(service.resource).hostname}`;
  }

  /**
   * Format metadata into a readable string
   */
  private formatMetadata(metadata: Record<string, any>): string {
    const parts: string[] = [];
    
    // Include useful metadata fields
    const usefulFields = ['description', 'name', 'title', 'category', 'tags', 'version'];
    for (const field of usefulFields) {
      if (metadata[field] && typeof metadata[field] === 'string') {
        parts.push(`${field}: ${metadata[field]}`);
      }
    }
    
    // Include other string/number fields (but not objects/arrays)
    for (const [key, value] of Object.entries(metadata)) {
      if (!usefulFields.includes(key) && 
          (typeof value === 'string' || typeof value === 'number') &&
          value.toString().length < 100) {
        parts.push(`${key}: ${value}`);
      }
    }
    
    return parts.length > 0 ? parts.join(', ') : '';
  }
}
