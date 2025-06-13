import {
  PolymarketMarket,
  PolymarketApiResponse,
  PolymarketRawMarket,
  PolymarketRawMarketSchema,
  PolymarketApiCallParams,
  PolymarketSingleMarketApiResponse,
  PolymarketApiDataSchema
} from "../types";
import { Service, IAgentRuntime, logger, Memory } from '@elizaos/core';

export class GammaService extends Service {
static serviceType = 'GammaService';
static apiUrl = "https://gamma-api.polymarket.com/markets";
static DEFAULT_LIQUIDITY_MIN = "5000";
static DEFAULT_VOLUME_MIN = "5000";

static register(runtime: IAgentRuntime): IAgentRuntime {
  return runtime;
}

// Required: Describe what this service enables the agent to do
capabilityDescription = "Enables the agent to interact with Polymarket's Gamma API";

// Store runtime for service operations
constructor(protected runtime: IAgentRuntime) {
  super(runtime);
}

static async start(runtime: IAgentRuntime): Promise<GammaService> {
  const service = new GammaService(runtime);
  return service;
}

static async stop(runtime: IAgentRuntime): Promise<void> {
  const service = runtime.getService(GammaService.serviceType);
  if (!service) {
    throw new Error('Gamma service not found');
  }
  service.stop();
}

async stop() {}

static async fetchMarkets(): Promise<PolymarketApiResponse> {
    const params: Omit<PolymarketApiCallParams, 'limit' | 'offset'> = {
        active: true,
        closed: false,
        archived: false,
        liquidity_num_min: this.DEFAULT_LIQUIDITY_MIN,
        volume_num_min: this.DEFAULT_VOLUME_MIN,
        ascending: false
    };

    const { markets, error } = await GammaService._fetchAllMarketsPaginated(params);
    
    if (error) return { success: false, error, markets: []};

    return { success: true, markets };
}

/**
 * Fetches a specific market by its ID
 * @param marketId - The ID of the market to fetch
 * @returns Promise resolving to market data
 */
static async fetchMarketById(marketId: string): Promise<PolymarketSingleMarketApiResponse> {
  if (typeof marketId !== 'string' || marketId.trim() === '') {
    return { success: false, error: "Market ID must be a non-empty string." };
  }
  
  try {
    const response = await fetch(`${this.apiUrl}/${marketId.trim()}`);
    
    if (!response.ok) {
      logger.info("response not ok", response);
      if (response.status === 404) return { 
        success: false, 
        error: `Market with ID "${marketId}" not found.` 
      };
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const rawMarketData = await response.json();
    const result = PolymarketRawMarketSchema.safeParse(rawMarketData);
    
    if (result.success) {
      const rawMarketData = result.data;
      const market = GammaService._transformMarketData(rawMarketData);
      return { success: true, market: market };
    }
    return { 
      success: false, 
      error: `Invalid response format: ${result.error.message}` 
    };
  } catch (error) {
    console.log(`Error fetching market by ID "${marketId}":`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred." 
    };
  }
}

/**
 * Builds API URL with the provided parameters
 * @param params - Parameters for the API call
 * @returns Constructed API URL
 */
  private static _buildApiUrl(params: PolymarketApiCallParams): string {
  const query = new URLSearchParams();
  
  query.append('limit', params.limit?.toString() ?? '100');
  query.append('offset', params.offset?.toString() ?? '0');

  if (params.id) query.append('id', params.id);
  if (params.slug) query.append('slug', params.slug);
  if (params.clob_token_ids) query.append('clob_token_ids', params.clob_token_ids);
  if (params.active !== undefined) query.append('active', params.active.toString());
  if (params.closed !== undefined) query.append('closed', params.closed.toString());
  if (params.archived !== undefined) query.append('archived', params.archived.toString());
  if (params.volume_num_min) query.append('volume_num_min', params.volume_num_min);
  if (params.liquidity_num_min) query.append('liquidity_num_min', params.liquidity_num_min);

  return `${this.apiUrl}?${query.toString()}`;
}

/**
 * Transforms raw market data into the PolymarketMarket structure
 * @param rawMarket - Raw market data from API
 * @returns Transformed market data
 */
  private static _transformMarketData(rawMarket: PolymarketRawMarket): PolymarketMarket {
  let processedOutcomes: { name: string; price: string; clobTokenId: string }[] = [];
  
  try {
    const outcomeNames = typeof rawMarket.outcomes === 'string' ? JSON.parse(rawMarket.outcomes) : rawMarket.outcomes;
    const outcomePricesStr = typeof rawMarket.outcomePrices === 'string' ? JSON.parse(rawMarket.outcomePrices) : rawMarket.outcomePrices;
    const clobTokenIds = typeof rawMarket.clobTokenIds === 'string' ? JSON.parse(rawMarket.clobTokenIds) : rawMarket.clobTokenIds;

    if (Array.isArray(outcomeNames) && Array.isArray(outcomePricesStr) && Array.isArray(clobTokenIds) && 
        outcomeNames.length === outcomePricesStr.length && outcomeNames.length === clobTokenIds.length) {
      processedOutcomes = outcomeNames.map((name: string, index: number) => ({
        clobTokenId: clobTokenIds[index],
        name: name,
        price: outcomePricesStr[index] || "0",
      }));
    } else if (rawMarket.outcomes || rawMarket.outcomePrices) {
      console.log(`rawMarket ID ${rawMarket.id}: Mismatch or invalid format in outcomes/outcomePrices. Received outcomes: ${rawMarket.outcomes}, Received prices: ${rawMarket.outcomePrices}`);
    }
  } catch (e) {
    console.log(`rawMarket ID ${rawMarket.id}: Error parsing outcomes/prices JSON strings. Received outcomes: ${rawMarket.outcomes}, Received prices: ${rawMarket.outcomePrices}`, e);
  }
  
  return {
    id: rawMarket.id,
    slug: rawMarket.slug,
    question: rawMarket.question,
    description: rawMarket.description || "",
    active: rawMarket.active,
    closed: rawMarket.closed,
    acceptingOrders: rawMarket.acceptingOrders,
    new: rawMarket.new,
    volume: rawMarket.volume || "0",
    liquidity: rawMarket.liquidity || "0",
    url: `https://polymarket.com/market/${rawMarket.slug}`,
    startDate: rawMarket.startDate,
    endDate: rawMarket.endDate,
    orderMinSize: rawMarket.orderMinSize,
    orderPriceMinTickSize: rawMarket.orderPriceMinTickSize,
    volume24hr: rawMarket.volume24hr,
    volume1wk: rawMarket.volume1wk,
    volume1mo: rawMarket.volume1mo,
    volume1yr: rawMarket.volume1yr,
    oneDayPriceChange: rawMarket.oneDayPriceChange,
    oneHourPriceChange: rawMarket.oneHourPriceChange,
    oneWeekPriceChange: rawMarket.oneWeekPriceChange,
    oneMonthPriceChange: rawMarket.oneMonthPriceChange,
    lastTradePrice: rawMarket.lastTradePrice,
    bestBid: rawMarket.bestBid,
    bestAsk: rawMarket.bestAsk,
    outcomes: processedOutcomes,
  };
}

/**
 * Fetches a single page of markets based on provided API parameters
 * @param apiParams - Parameters for the API call
 * @returns Promise resolving to market data
 */
  private static async _fetchMarketPage(apiParams: PolymarketApiCallParams): Promise<PolymarketApiResponse> {
  try {
    const url = this._buildApiUrl(apiParams);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const result = PolymarketApiDataSchema.safeParse(data);
    
    if (result.success) {
      const resultData = result.data;
      const markets = resultData.map((market: PolymarketRawMarket) => GammaService._transformMarketData(market));
      return { success: true, markets };
    }
    return { 
      success: false, 
      error: "Invalid response format", 
      markets: [] 
    };

  } catch (error) {
    console.log("Error in _fetchMarketPage:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred in _fetchMarketPage",
      markets: []
    };
  }
}

/**
 * Helper to fetch all markets by handling pagination
 * @param baseParams - Base parameters for the API call
 * @returns Promise resolving to full set of market data
 */
  private static async _fetchAllMarketsPaginated(baseParams: Omit<PolymarketApiCallParams, 'limit' | 'offset'>): Promise<PolymarketApiResponse> {
  const allMarkets: PolymarketMarket[] = [];
  let offset = 0;
  const limit = 100; // Polymarket's typical max limit per page
  let hasMore = true;
  let totalFetchedInSession = 0; // Safety break for runaway pagination

  while (hasMore) {
    const pageParams: PolymarketApiCallParams = {
      ...baseParams,
      limit,
      offset,
    };
    
    const pageResponse = await this._fetchMarketPage(pageParams);

    if (!pageResponse.success || !pageResponse.markets) {
      // If a page fails, return what we have so far with the error
      return { 
        success: false, 
        error: pageResponse.error || "Pagination failed", 
        markets: allMarkets 
      };
    }

    if (pageResponse.markets.length > 0) {
      allMarkets.push(...pageResponse.markets);
      offset += pageResponse.markets.length;
      totalFetchedInSession += pageResponse.markets.length;
    }
    
    if (pageResponse.markets.length < limit) {
      hasMore = false;
    }
  }

  return { success: true, markets: allMarkets };
}

async buyShares(marketId: string, outcome: string, quantity: number): Promise<any> {
    throw new Error("Method not implemented.");
}

async sellShares(marketId: string, outcome: string, quantity: number): Promise<any> {
    throw new Error("Method not implemented.");
}

async redeemShares(marketId: string): Promise<any> {
    throw new Error("Method not implemented.");
}
};
