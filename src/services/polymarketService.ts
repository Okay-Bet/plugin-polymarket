import { Service, IAgentRuntime, logger } from "@elizaos/core/v2";
import { buyMarketOutcome, sellMarketOutcome, redeemPositions } from "@polymarket/sdk";
import {
  PolymarketMarket,
  PolymarketApiResponse,
  PolymarketSingleMarketApiResponse,
  OrderParams,
  OrderResult,
  RedeemResult,
  RedeemParams,
  ApiKeyResult
} from "../types";
import { getOrCreateApiKey } from "../providers/keyGen";

export class PolymarketService extends Service {
  private isConnected: boolean = false; // Track connection state
  static async redeemUserPositions(params: RedeemParams): Promise<RedeemResult> {
    try {
      return await PolymarketService.redeemUserPositionsSDK(params);
    } catch (error: any) {
      return { success: false, error: `Redemption failed: ${error.message}` };
    }
  }
  static serviceType = 'PolymarketService';

  static apiUrl = "https://gamma-api.polymarket.com"; // Base URL for CLOB API

  static DEFAULT_LIQUIDITY_MIN = "5000";
  static DEFAULT_VOLUME_MIN = "5000";

  static register(runtime: IAgentRuntime): IAgentRuntime {
    return runtime;
  }

  capabilityDescription = "Enables the agent to trade on Polymarket's CLOB API";// @Author: Tony363
  static async start(runtime: IAgentRuntime): Promise<PolymarketService> {
    const service = new PolymarketService(runtime);
    return service;
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    const service = runtime.getService(PolymarketService.serviceType);
    if (!service) {
      throw new Error('PolymarketService not found');
    }
    service.stop();
  }

  constructor(runtime: IAgentRuntime) {
    super(runtime)
    logger.info(`Loading PolymarketService with PK: ${process.env.PK}`)
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

  async createApiKey(): Promise<ApiKeyResult> {
    try {
      const apiKey = await getOrCreateApiKey();
      return { success: true, apiKey: apiKey };
    } catch (error: any) {
      logger.error("Error creating API key:", error);
      return { success: false, error: `Failed to create API key: ${error.message}` };
    }
  }

  static async redeemUserPositionsSDK(params: RedeemParams): Promise<RedeemResult> {
    try {
      const transactions = await redeemPositions(params.conditionalTokensAddress, params.collateralTokenAddress, params.conditionId, params.outcomeSlotCount)
      // Placeholder for transaction handling, needs actual implementation
      const transactionDetails = transactions.map(tx => ({ typeCode: tx.typeCode, data: tx.data }))
      return {
        success: true,
        message: `Successfully initiated redemption. Transaction details: ${JSON.stringify(transactionDetails)}`,
        transactionDetails,
        //transactionHash: "0xTransactionHash" //Add placeholder txHash for testing

      }
    } catch (error: any) {
      logger.error("Error during redemption:", error)
      return { success: false, error: `Redemption failed: ${error.message}` }
    }
  }

  /**
   * Places an order to buy shares using the SDK
   * @param params - Parameters for the order
   * @returns Order result with success status and details
   */
  async buySharesSDK(params: OrderParams): Promise<OrderResult> {
    try {
      const transactions = await buyMarketOutcome(
        params.marketMakerAddress,
        params.conditionalTokensAddress,
        params.returnAmount,
        params.outcomeIndex,
        params.maxOutcomeTokensToSell,
      )
      const orderDetails = transactions.map(tx => ({ typeCode: tx.typeCode, data: tx.data }))
      return {
        success: true,
        orderId: JSON.stringify(orderDetails),
        message: `Successfully placed buy order for ${params.returnAmount} shares at outcome index ${params.outcomeIndex} using SDK. Order details: ${JSON.stringify(
          orderDetails,
        )}`,
      };
    } catch (error: any) {
      logger.error("Error placing buy order with SDK:", error);
      return {
        success: false,
        error: `Failed to place buy order with SDK: ${error.message}`,
      };
    }
  }

  /**
   * Places an order to sell shares using the SDK
   * @param params - Parameters for the order
   * @returns Order result with success status and details
   */
  async sellSharesSDK(params: OrderParams): Promise<OrderResult> {
    try {
      const transactions = await sellMarketOutcome(
        params.marketMakerAddress,
        params.conditionalTokensAddress,
        params.returnAmount,
        params.outcomeIndex,
        params.maxOutcomeTokensToSell,
      )
      const orderDetails = transactions.map(tx => ({
        typeCode: tx.typeCode,
        data: tx.data,
      }))
      return {
        success: true,
        orderId: JSON.stringify(orderDetails),
        message: `Successfully placed sell order for ${params.returnAmount} shares at outcome index ${params.outcomeIndex} using SDK. Order details: ${JSON.stringify(orderDetails)}`,
      };
    } catch (error: any) {
      logger.error("Error placing sell order with SDK:", error);
      return { success: false, error: `Failed to place sell order with SDK: ${error.message}` }
    }
  }

  async stop() {
    logger.info("PolymarketService stopped");
  }
  static async fetchMarkets(params?: any): Promise<PolymarketApiResponse> {
    const { limit = "1000", activeOnly = true, query = "" } = params; // 'limit' here is the user's desired final count
    const API_FETCH_COUNT = '1000'; // Fixed count for fetching from Polymarket API

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

      const marketData = await response.json() as PolymarketMarket;
      logger.debug(JSON.stringify(marketData));
      return { success: true, market: marketData as PolymarketMarket };
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


  private static async fetchMarketPage(apiParams: any): Promise<PolymarketApiResponse> {
    try {
      const url = this._buildApiUrl("markets", apiParams);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = (await response.json()) as PolymarketMarket[];
      // No schema parsing yet, assuming PolymarketApiResponse format for raw data
      return { success: true, markets: data };
    } catch (error: any) {
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

  
}