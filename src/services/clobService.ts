import {
  Service,
  IAgentRuntime,
  logger,
} from "@elizaos/core/v2";
import { ethers } from "ethers";
import { ClobClient, AssetType } from "@polymarket/clob-client";
import {
  PolymarketMarket,
  PolymarketApiResponse,
  PolymarketSingleMarketApiResponse,
} from "../types";

export class ClobService extends Service  {
  static serviceType = "ClobService";
  private clobClient: ClobClient;

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
      this.clobClient = null; // Ensure client is null if connection fails
      throw new Error(`Wallet connection error: ${error.message}`);
    }
  }

  static async start(runtime: IAgentRuntime): Promise<ClobService> {
    const service = new ClobService(runtime);
    return service;
  }

  static register(runtime: IAgentRuntime): IAgentRuntime {
    return runtime;
  }

  capabilityDescription =
    "Provides access to the Polymarket CLOB client for trading operations.";

  getClobClient(): ClobClient {
    if (!this.clobClient) {
      throw new Error(
        "ClobClient not initialized. Ensure the wallet is connected. Call connectWallet() if needed.",
      );
    }
    return this.clobClient;
  }

  async updateBalanceAllowance(
    assetType: AssetType,
    tokenId?: string,
  ): Promise<void> {
    try {
      if (!this.clobClient) {
        throw new Error(
          "ClobClient not initialized. Ensure the wallet is connected.",
        );
      }
      const params = { asset_type: assetType };
      if (tokenId) {
        params["token_id"] = tokenId;
      }

      // The updateBalanceAllowance function can only take the above object, or a single string for token ID
      if (tokenId) {
        // Conditional token
        await this.clobClient.updateBalanceAllowance(params);
      } else {
        // Collateral token
        await this.clobClient.updateBalanceAllowance(params);
      }

      logger.info(
        `Successfully updated balance allowance for asset type: ${assetType}, token ID: ${tokenId || "N/A"}`,
      );
    } catch (error: any) {
      logger.error(`Failed to update balance allowance: ${error.message}`);
      throw new Error(`Failed to update balance allowance: ${error.message}`);
    }
  }
  async stop() {
    logger.info("ClobService stopped");
  }
  static async stop(runtime: IAgentRuntime): Promise<void> {
    const service = runtime.getService(ClobService.serviceType);
    if (!service) throw new Error("ClobService not found in runtime for stop");
    await service.stop();
  }
  static apiUrl = "https://gamma-api.polymarket.com/";
  static DEFAULT_LIQUIDITY_MIN = "5000";
  static DEFAULT_VOLUME_MIN = "5000";

  static async fetchMarkets(): Promise<PolymarketApiResponse> {
    try {
      const apiUrl = `${this.apiUrl}markets?active=true&closed=false&archived=false&liquidity_num_min=${this.DEFAULT_LIQUIDITY_MIN}&volume_num_min=${this.DEFAULT_VOLUME_MIN}&ascending=false`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch markets: ${response.statusText}`);
      }
      const data = await response.json() as any[];
      // Assuming the API returns an array of raw market objects
      const markets: PolymarketMarket[] = data.map((rawMarket: any) =>
        ClobService._transformMarketData(rawMarket)
      );
      return { success: true, markets };
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
      const response = await fetch(`${this.apiUrl}/${marketId.trim()}`);

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
      return { success: true, market: marketData };
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
  private static _buildApiUrl(params: any): string {
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

    return `${this.apiUrl}?${query.toString()}`;
  }

   /**
   * Transforms raw market data from the Polymarket API into a `PolymarketMarket` object.
   * @param rawMarket The raw market data object from the API.
   * @returns A `PolymarketMarket` object representing the transformed market data.
   */
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
      volume: rawMarket.volume || "0",
      liquidity: rawMarket.liquidity || "0",
    };
  }

  /**
   * Fetches a single page of markets based on provided API parameters
   * @param apiParams - Parameters for the API call
   * @returns Promise resolving to market data
   */
  private static async fetchMarketPage(apiParams: any): Promise<PolymarketApiResponse> {
    try {
      const url = this._buildApiUrl(apiParams);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json() as PolymarketMarket[];
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

  /**
   * Helper to fetch all markets by handling pagination
   * @param baseParams - Base parameters for the API call
   * @returns Promise resolving to full set of market data
   */
  private static async fetchAllMarketsPaginated(
    baseParams: Omit<any, "limit" | "offset">,
  ): Promise<PolymarketApiResponse> {
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
          "Safety break triggered: Fetched over 10000 markets in a single session. Potential runaway pagination.",
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
    throw new Error("Method not implemented.");
  }

  async redeemShares(marketId: string): Promise<any> {
    throw new Error("Method not implemented.");
  }
}
