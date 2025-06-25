import { Service, IAgentRuntime, logger } from "@elizaos/core/v2";
import { buyMarketOutcome, sellMarketOutcome, redeemPositions } from "@polymarket/sdk";
import {
  PolymarketMarket,
  PolymarketApiResponse, 
  PolymarketSingleMarketApiResponse,
  OrderResult,
  RedeemParams,
  RedeemResult
} from '../types';

export type OrderParams = any;
/***
 * Service for interacting with Polymarket's Central Limit Order Book (CLOB) API
 * Handles trading operations like buying, selling and redeeming winnings
 */
export class ClobService extends Service {
  getSDK() {
    throw new Error("Method not implemented.");
  }
  static serviceType = 'ClobService';

  static apiUrl = "https://gamma-api.polymarket.com"; // Base URL for CLOB API

  static DEFAULT_LIQUIDITY_MIN = "5000";
  static DEFAULT_VOLUME_MIN = "5000";


  private clobClient!: ClobClient;
  capabilityDescription = "Enables the agent to trade on Polymarket's CLOB API";// @Author: Tony363

  // capabilityDescription = "Provides access to the Polymarket CLOB client for trading operations."; // @Author: JT-Creates


  static async start(runtime: IAgentRuntime): Promise<ClobService> {
    const service = new ClobService(runtime);
    return service;
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    const service = runtime.getService(ClobService.serviceType);
    if (!service) {
      throw new Error('ClobService not found');
    }
    service.stop();
  }

  /**
   * Places an order to buy or sell shares
   * @param params - Parameters for the order
   * @returns Order result with success status and details
   */
  static async placeOrder(params: OrderParams): Promise<OrderResult> {
    // Get API key from environment variables
    const apiKey = process.env.POLYMARKET_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "API key not configured. Please set POLYMARKET_API_KEY in your environment."
      };
    }

    // Construct the order payload
    const payload = {
      marketId: params.marketId,
      outcomeId: params.outcomeId,
      side: params.side, // 'BUY' or 'SELL'
      size: params.amount,
      price: params.price,
      type: params.orderType || 'LIMIT' // Default to limit order 
    };

    // Send the request
    let response;
    let data;

    response = await fetch(`${this.apiUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    }).catch(error => {
      logger.error("Network error in placeOrder:", error);
      return null;
    });

    if (!response) {
      return {
        success: false,
        error: "Network error while connecting to Polymarket API"
      };
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      return {
        success: false, 
        error: `Order placement failed: ${response.status} ${errorText}`
      };
    }

    data = await response.json().catch(() => null);
    if (!data) {
      return {
        success: false,
        error: "Failed to parse API response"
      };
    }

    return {
      success: true,
      orderId: data.orderId,
      message: `Successfully placed ${params.side.toLowerCase()} order for ${params.amount} shares at $${params.price}`
    };
  }

  /**
   * Cancels an existing order
   * @param orderId - ID of the order to cancel
   * @returns Order cancellation result
   */
  static async cancelOrder(orderId: string): Promise<OrderResult> {
    const apiKey = process.env.POLYMARKET_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "API key not configured. Please set POLYMARKET_API_KEY in your environment."
      };
    }

    let response = await fetch(`${this.apiUrl}/orders/${orderId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    }).catch(error => {
      logger.error("Network error in cancelOrder:", error);
      return null;
    });

    if (!response) {
      return {
        success: false,
        error: "Network error while connecting to Polymarket API"
      };
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      return {
        success: false,
        error: `Order cancellation failed: ${response.status} ${errorText}`
      };
    }

    return {
      success: true,
      orderId: orderId,
      message: `Successfully cancelled order ${orderId}`
    };
  }

  /**
   * Redeems winnings from resolved markets
   * @param params - Parameters for redemption
   * @returns Redemption result
   */
  static async redeemWinnings(params: RedeemParams): Promise<RedeemResult> {
    const apiKey = process.env.POLYMARKET_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "API key not configured. Please set POLYMARKET_API_KEY in your environment."
      };
    }

    // Construct the redeem payload
    const payload = params.marketId ? { marketId: params.marketId } : {};

    let response = await fetch(`${this.apiUrl}/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    }).catch(error => {
      logger.error("Network error in redeemWinnings:", error);
      return null;
    });

    if (!response) {
      return {
        success: false,
        error: "Network error while connecting to Polymarket API"
      };
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      return {
        success: false,
        error: `Redemption failed: ${response.status} ${errorText}`
      };
    }

    const data = await response.json().catch(() => null) as any;
    if (!data) {
      return {
        success: false,
        error: "Failed to parse API response"
      };
    }

    return {
      success: true,
      amount: data.amount || '0', // Ensure amount is always a string, default to '0' if not present
      message: `Successfully redeemed winnings: ${data.amount || '0'} USDC`
    };
  }

  constructor(runtime: IAgentRuntime) {
    super(runtime);

    // Initialize the ClobClient here, using environment variables
    // Assuming IWallet is now called something else or needs a different import
    logger.info(`Loading ClobService with PK: ${process.env.PK}`);
  }

  // Include ClobService functions here, prefixed with 'static' as needed or adjusted 
  // Example:

  async connectWallet(privateKey: string): Promise<void> {
    try {
      if (!privateKey) {
        throw new Error(
          "Private key not provided in environment or function argument.",
        );
      }

      const wallet = new ethers.Wallet(privateKey);
      const chainId = parseInt(process.env.CHAIN_ID || "80001", 10); // Default to 80001
      const host = process.env.CLOB_API_URL || "http://localhost:8080"; 
      const clobClient = new ClobClient(host, chainId, wallet as any);

      this.clobClient = clobClient;
      logger.info(
        `ClobService wallet connected successfully for address: ${await wallet.getAddress()}`,
      );
    } catch (error: any) {
      logger.error(`Failed to connect wallet: ${error.message}`);
      this.clobClient = undefined as any; // Ensure client is null if connection fails

      throw new Error(`Wallet connection error: ${error.message}`);
    }
  }
  static serviceType = 'ClobService';

  getClobClient(): ClobClient {
    if (!this.clobClient) {
      throw new Error(
        "ClobClient not initialized. Ensure the wallet is connected. Call connectWallet() if needed.",
      );
    }
    return this.clobClient;
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    const service = runtime.getService(ClobService.serviceType);
    if (!service) {
      throw new Error('ClobService not found');
    }
    service.stop();
  }

  constructor(runtime: IAgentRuntime) {
    super(runtime)
    logger.info(`Loading ClobService with PK: ${process.env.PK}`)
    // Attempt automatic connection on service start
    this.attemptAutoConnect();
  }

  private async attemptAutoConnect(): Promise<void> {
    try {
      if (process.env.PK) {
        // Replace with SDK's connection method using private key, if available
        // Example (adjust based on SDK documentation):
        // await connectWithPrivateKey(process.env.PK);
        this.isConnected = true;
        logger.info("Successfully auto-connected wallet using .env credentials.");
      }
    } catch (error: any) {
      logger.error(`Auto-connect failed: ${error.message}`);
    }
  }

  async stop() {
    logger.info("ClobService stopped");
  }
  static async fetchMarkets(): Promise<PolymarketApiResponse> {
    try {

    
      // Calculate date 3 days ago for filtering
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const endDateMin = threeDaysAgo.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      
      // Build query parameters
      const params = {
        limit: API_FETCH_COUNT, // Use fixed count for API request
        offset: '0',
        active: activeOnly.toString(),
        ascending: 'false',
        end_date_min: endDateMin,
        liquidity_num_min: '5000',
        volume_num_min: '20000'
      };
      
      const apiUrl = this._buildApiUrl("markets", params);
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch markets: ${response.statusText}`);
      }
      const data = (await response.json()) as any[];
      logger.warn(JSON.stringify(data).substring(0,500));
      
      // Transform API response to our internal format
      const markets: PolymarketMarket[] = data.map((market: any) => {
        let processedOutcomes: { name: string; price: string; clobTokenId: string }[] = [];
        try {
          const outcomeNames = typeof market.outcomes === 'string' ? JSON.parse(market.outcomes) : market.outcomes;
          const outcomePricesStr = typeof market.outcomePrices === 'string' ? JSON.parse(market.outcomePrices) : market.outcomePrices;
          const clobTokenIds = typeof market.clobTokenIds === 'string' ? JSON.parse(market.clobTokenIds) : market.clobTokenIds;

          if (Array.isArray(outcomeNames) && Array.isArray(outcomePricesStr) && Array.isArray(clobTokenIds) && outcomeNames.length === outcomePricesStr.length && outcomeNames.length === clobTokenIds.length) {
            processedOutcomes = outcomeNames.map((name: string, index: number) => ({
              clobTokenId: clobTokenIds[index],
              name: name,
              price: (outcomePricesStr[index]) || "0",
            }));
          } else if (market.outcomes || market.outcomePrices) { // Log only if there was an attempt to parse
            console.warn(`Market ID ${market.id}: Mismatch or invalid format in outcomes/outcomePrices. Received outcomes: ${market.outcomes}, Received prices: ${market.outcomePrices}`);
          }
        } catch (e) {
          console.error(`Market ID ${market.id}: Error parsing outcomes/prices JSON strings. Received outcomes: ${market.outcomes}, Received prices: ${market.outcomePrices}`, e);
        }

        return {
          id: market.id,
          slug: market.slug,
          question: market.question,
          description: market.description || "",
          active: market.active,
            category: market.category,
          closed: market.closed,
          acceptingOrders: market.acceptingOrders,
          new: market.new,
          volume: market.volume || 0,
          liquidity: market.liquidity || 0,
          url: `https://polymarket.com/market/${market.slug}`,
          startDate: market.startDate,
          endDate: market.endDate,
          orderMinSize: market.orderMinSize,
          orderPriceMinTickSize: market.orderPriceMinTickSize,
          volume24hr: market.volume24hr,
          volume1wk: market.volume1wk,
          volume1mo: market.volume1mo,
          volume1yr: market.volume1yr,
          oneDayPriceChange: market.oneDayPriceChange,
          oneHourPriceChange: market.oneHourPriceChange,
          oneWeekPriceChange: market.oneWeekPriceChange,
          oneMonthPriceChange: market.oneMonthPriceChange,
          lastTradePrice: market.lastTradePrice,
          bestBid: market.bestBid,
          bestAsk: market.bestAsk,
          outcomes: processedOutcomes,
          resolutionSource: market.resolutionSource,
          resolved: market.resolved,
          archived: market.archived,
          tags: market.tags,
          conditions: market.condition,
        };
      });

      let filteredMarkets = markets;
      if (query && query.trim() !== "") {
        const lowerCaseQuery = query.toLowerCase().trim();
        filteredMarkets = markets.filter(m =>
          (m.question && m.question.toLowerCase().includes(lowerCaseQuery)) ||
          (m.description && m.description.toLowerCase().includes(lowerCaseQuery)) ||
          (m.slug && m.slug.toLowerCase().replace(/-/g, ' ').includes(lowerCaseQuery))
        );
      }

      // Apply the user-specified limit to the filtered markets
      const finalMarkets = filteredMarkets.slice(0, parseInt(limit));
      
      return {
        markets: finalMarkets,
        success: true,
      };
    } catch (error: any) {
      return { success: false, error: error.message, markets: [] };
    }
  }

  /**
   * Fetches a specific market by its ID
   * @param marketId - The ID of the market to fetch
   * @returns Promise resolving to market data
   */
  static async fetchMarketById(
    marketId: string,
  ): Promise<PolymarketSingleMarketApiResponse> {
    if (typeof marketId !== "string" || marketId.trim() === "") {
      return { success: false, error: "Market ID must be a non-empty string." };
    }

    try {
      const response = await fetch(`${this.apiUrl}/markets/${marketId.trim()}`);

      if (!response.ok) {
        logger.info("response not ok", response);
        if (response.status === 404)
          return {
            success: false,
            error: `Market with ID "${marketId}" not found.`,
          };
        throw new Error(`API request failed with status ${response.status}`);
      }

      const marketData = await response.json();
      return { success: true, market: ClobService._transformMarketData(marketData) };
    } catch (error) {
      console.log(`Error fetching market by ID "${marketId}":`, error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred.",
      };
    }
  }

  /**
   * Builds API URL with the provided parameters
   * @param params - Parameters for the API call
   * @returns Constructed API URL
   */
  private static _buildApiUrl(endpoint: string, params: any): string {
    const query = new URLSearchParams();

    query.append("limit", params.limit?.toString() ?? "100");
    query.append("offset", params.offset?.toString() ?? "0");

    if (params.id) query.append("id", params.id);
    if (params.slug) query.append("slug", params.slug);
    if (params.clob_token_ids)
      query.append("clob_token_ids", params.clob_token_ids);
    if (params.active !== undefined)
      query.append("active", params.active.toString());
    if (params.closed !== undefined)
      query.append("closed", params.closed.toString());
    if (params.archived !== undefined)
      query.append("archived", params.archived.toString());
    if (params.volume_num_min)
      query.append("volume_num_min", params.volume_num_min);
    if (params.liquidity_num_min)
      query.append("liquidity_num_min", params.liquidity_num_min);

    return `${this.apiUrl}/${endpoint}?${query.toString()}`;
  }

  /**
   * Transforms raw market data into the PolymarketMarket structure
   * @param rawMarket - Raw market data from API
   * @returns Transformed market data
   */
  private static _transformMarketData(rawMarket: any): PolymarketMarket {
    // Example transformation, adjust according to actual API response structure
    // and the fields defined in PolymarketMarket type
    if (!rawMarket) {
      // Handle cases where rawMarket might be undefined or null.
      return {
        id: "unknown",
        slug: "unknown",
        question: "No question",
        outcomes: [],
        description: "",
        active: false,
        volume: "0",
        liquidity: "0",
        // Add other necessary fields with default values or appropriate handling.
        // For instance, if `outcomes` is expected to be an array of a specific structure:
        // outcomes: [], // Initialize to an empty array of the expected type
        // You would adjust this based on the actual structure of `PolymarketMarket` and the API.
        // url: 'unknown',  // If url is a required field, provide a default or handle appropriately
        // ... other required fields with defaults or proper handling
      };
    }

    // TODO: Implement the transformation logic here.
    //       For now, it returns a placeholder.
    return {
      id: rawMarket.id || "unknown",
      slug: rawMarket.slug || "unknown",
      question: rawMarket.question || "No question",
      outcomes: rawMarket.outcomes || [],
      description: rawMarket.description || "",
      // Ensure 'active' is always a boolean
      active: rawMarket.active || false,
      // Ensure volume and liquidity are always strings with default "0"
      // (or another appropriate default for your application)
      volume: String(rawMarket.volume || "0"),
      liquidity: String(rawMarket.liquidity || "0"),
    };
  }

  /**
   * Fetches a single page of markets based on provided API parameters
   * @param apiParams - Parameters for the API call
   * @returns Promise resolving to market data
   */
  private static async fetchMarketPage(
    apiParams: any,
  ): Promise<PolymarketApiResponse> {
    try {
      const url = this._buildApiUrl("markets", apiParams);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = (await response.json()) as PolymarketMarket[];
      // No schema parsing yet, assuming PolymarketApiResponse format for raw data
      return { success: true, markets: data };
    } catch (error) {
      console.log("Error in fetchMarketPage:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error occurred in fetchMarketPage",
        markets: [],
      };
    }
  }  

  private static async fetchAllMarketsPaginated(baseParams: Omit<any, "limit" | "offset">): Promise<PolymarketApiResponse> {
    const allMarkets: PolymarketMarket[] = [];

    let offset = 0;
    const limit = 100; // Polymarket's typical max limit per page
    let hasMore = true;
    let totalFetchedInSession = 0; // Safety break for runaway pagination

    while (hasMore) {
      const pageParams: any = {
        ...baseParams,
        limit,
        offset,
      };

      const pageResponse = await this.fetchMarketPage(pageParams);

      if (!pageResponse.success || !pageResponse.markets) {
        // If a page fails, return what we have so far with the error
        return {
          success: false,
          error: pageResponse.error || "Pagination failed",
          markets: allMarkets,
        };
      }
      if (totalFetchedInSession >= 10000) {
        // Example limit. Adjust as needed
        logger.warn(
            "Safety break triggered: Fetched over 10000 markets in a single session. Potential runaway pagination."
        );
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

  async buyShares(
    marketId: string,
    outcome: string,
    quantity: number,
  ): Promise<any> {
    throw new Error("Method not implemented.");
  }

  async sellShares(
    marketId: string,
    outcome: string,
    quantity: number,
  ): Promise<any> {
  }
}
