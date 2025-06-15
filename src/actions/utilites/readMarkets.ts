import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type Content,
  // ModelType,
  // composePromptFromState,
  HandlerCallback,
  logger,
} from "@elizaos/core";
import { GammaService } from "../../services/gammaService";
import {
  ReadMarketsActionContent,
  ReadMarketsData,
  PolymarketMarket,
  PolymarketApiResponse,
  PolymarketApiDataSchema,
  PolymarketRawMarket,
  PolymarketRawMarketSchema,
  PolymarketApiCallParams,
  PolymarketSingleMarketApiResponse,
} from "../../types";

const apiUrl = "https://gamma-api.polymarket.com/markets";
const DEFAULT_LIQUIDITY_MIN = "1000";
const DEFAULT_VOLUME_MIN = "1000";

const fetchMarkets = async (): Promise<PolymarketApiResponse> => {
  const params: Omit<PolymarketApiCallParams, "limit" | "offset"> = {
    active: true,
    liquidity_num_min: DEFAULT_LIQUIDITY_MIN,
    volume_num_min: DEFAULT_VOLUME_MIN,
    ascending: false,
  };

  const { markets, error } = await _fetchAllMarketsPaginated(params);

  if (error) return { success: false, error, markets: [] };

  return { success: true, markets };
};

/**
 * Fetches a specific market by its ID
 * @param marketId - The ID of the market to fetch
 * @returns Promise resolving to market data
 */
const fetchMarketById = async (
  marketId: string,
): Promise<PolymarketSingleMarketApiResponse> => {
  if (!marketId || typeof marketId !== "string" || marketId.trim() === "") {
    return { success: false, error: "Market ID must be a non-empty string." };
  }

  try {
    const response = await fetch(`${apiUrl}/${marketId.trim()}`);

    if (!response.ok) {
      if (response.status === 404)
        return {
          success: false,
          error: `Market with ID "${marketId}" not found.`,
        };
      throw new Error(`API request failed with status ${response.status}`);
    }

    const rawMarketData = await response.json();
    const result = PolymarketRawMarketSchema.safeParse(rawMarketData);

    if (result.success) {
      const rawMarketData = result.data;
      const market = _transformMarketData(rawMarketData);
      return { success: true, market: market };
    }
    return {
      success: false,
      error: `Invalid response format: ${result.error.message}`,
    };
  } catch (error) {
    console.log(`Error fetching market by ID "${marketId}":`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred.",
    };
  }
};

/**
 * Builds API URL with the provided parameters
 * @param params - Parameters for the API call
 * @returns Constructed API URL
 */
const _buildApiUrl = (params: PolymarketApiCallParams): string => {
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

  return `${apiUrl}?${query.toString()}`;
};

/**
 * Transforms raw market data into the PolymarketMarket structure
 * @param rawMarket - Raw market data from API
 * @returns Transformed market data
 */
const _transformMarketData = (
  rawMarket: PolymarketRawMarket,
): PolymarketMarket => {
  let processedOutcomes: {
    name: string;
    price: string;
    clobTokenId: string;
  }[] = [];

  try {
    const outcomeNames =
      typeof rawMarket.outcomes === "string"
        ? JSON.parse(rawMarket.outcomes)
        : rawMarket.outcomes;
    const outcomePricesStr =
      typeof rawMarket.outcomePrices === "string"
        ? JSON.parse(rawMarket.outcomePrices)
        : rawMarket.outcomePrices;
    const clobTokenIds =
      typeof rawMarket.clobTokenIds === "string"
        ? JSON.parse(rawMarket.clobTokenIds)
        : rawMarket.clobTokenIds;

    if (
      Array.isArray(outcomeNames) &&
      Array.isArray(outcomePricesStr) &&
      Array.isArray(clobTokenIds) &&
      outcomeNames.length === outcomePricesStr.length &&
      outcomeNames.length === clobTokenIds.length
    ) {
      processedOutcomes = outcomeNames.map((name: string, index: number) => ({
        clobTokenId: clobTokenIds[index],
        name: name,
        price: outcomePricesStr[index] || "0",
      }));
    } else if (rawMarket.outcomes || rawMarket.outcomePrices) {
      console.log(
        `rawMarket ID ${rawMarket.id}: Mismatch or invalid format in outcomes/outcomePrices. Received outcomes: ${rawMarket.outcomes}, Received prices: ${rawMarket.outcomePrices}`,
      );
    }
  } catch (e) {
    console.log(
      `rawMarket ID ${rawMarket.id}: Error parsing outcomes/prices JSON strings. Received outcomes: ${rawMarket.outcomes}, Received prices: ${rawMarket.outcomePrices}`,
      e,
    );
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
};

/**
 * Fetches a single page of markets based on provided API parameters
 * @param apiParams - Parameters for the API call
 * @returns Promise resolving to market data
 */
const _fetchMarketPage = async (
  apiParams: PolymarketApiCallParams,
): Promise<PolymarketApiResponse> => {
  try {
    const url = _buildApiUrl(apiParams);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const result = PolymarketApiDataSchema.safeParse(data);

    if (result.success) {
      const resultData = result.data;
      const markets = resultData.map((market: PolymarketRawMarket) =>
        _transformMarketData(market),
      );
      return { success: true, markets };
    }
    return {
      success: false,
      error: "Invalid response format",
      markets: [],
    };
  } catch (error) {
    console.log("Error in _fetchMarketPage:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error occurred in _fetchMarketPage",
      markets: [],
    };
  }
};

/**
 * Helper to fetch all markets by handling pagination
 * @param baseParams - Base parameters for the API call
 * @returns Promise resolving to full set of market data
 */
const _fetchAllMarketsPaginated = async (
  baseParams: Omit<PolymarketApiCallParams, "limit" | "offset">,
): Promise<PolymarketApiResponse> => {
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

    const pageResponse = await _fetchMarketPage(pageParams);

    if (!pageResponse.success || !pageResponse.markets) {
      // If a page fails, return what we have so far with the error
      return {
        success: false,
        error: pageResponse.error || "Pagination failed",
        markets: allMarkets,
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
};

export const readMarketsAction: Action = {
  name: "READ_POLYMARKET_MARKETS",
  similes: [
    "POLYMARKET_READER",
    "PREDICTION_MARKETS_VIEWER",
    "MARKET_DATA_FETCHER",
    "BETTING_ODDS_CHECKER",
  ],
  description: "Reads prediction markets data from Polymarket",
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Show me the top prediction markets on Polymarket" },
      },
      {
        name: "{{agent}}",
        content: {
          text: 'Here are the top 5 prediction markets on Polymarket:\n1. "Will Trump win the 2024 election?" - Yes: $0.52, No: $0.48\n2. "Will Bitcoin exceed $100k in 2024?" - Yes: $0.35, No: $0.65\n3. "Will OpenAI release GPT-5 in 2024?" - Yes: $0.72, No: $0.28\n4. "Will SpaceX reach Mars by 2026?" - Yes: $0.15, No: $0.85\n5. "Will the Fed cut rates in June?" - Yes: $0.62, No: $0.38',
          action: ["READ_POLYMARKET_MARKETS"],
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: {
          text: "What are the current odds on Polymarket about Bitcoin?",
          //action: [""]
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: 'I found 3 markets about Bitcoin on Polymarket:\n1. "Will Bitcoin exceed $100k in 2024?" - Yes: $0.35, No: $0.65\n2. "Will Bitcoin drop below $40k in May 2024?" - Yes: $0.22, No: $0.78\n3. "Will a Bitcoin ETF be approved in 2024?" - Yes: $0.89, No: $0.11',
          action: ["READ_POLYMARKET_MARKETS"],
        },
      },
    ],
  ],

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ): Promise<boolean> => {
    // try {
    const content = message.content as ReadMarketsActionContent;
    const text = content.text.toLowerCase();

    // Check for keywords related to Polymarket and prediction markets
    const hasPolymarketKeyword = text.includes("polymarket");
    const hasPredictionMarketKeywords =
      text.includes("prediction market") ||
      text.includes("betting odds") ||
      text.includes("prediction") ||
      text.includes("markets");

    // Check for action keywords
    const hasActionKeywords =
      text.includes("show") ||
      text.includes("get") ||
      text.includes("what") ||
      text.includes("find") ||
      text.includes("list") ||
      text.includes("tell") ||
      text.includes("retriev") ||
      text.includes("market") ||
      text.includes("markets") ||
      text.includes("market prices");

    return (
      hasActionKeywords && (hasPolymarketKeyword || hasPredictionMarketKeywords)
    );
    // } catch {
    //   return false;
    // }
    // return true;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[],
  ) => {
    try {
      const content = message.content as ReadMarketsActionContent;
      const text = content.text;

      // const prompt = composePromptFromState({
      //   state,
      //   template: readMarketsTemplate,
      // });
      // const reflection = await runtime.useModel(ModelType.OBJECT_SMALL, {
      //   prompt,
      // });
      // console.log(reflection)

      // Extract query if present
      let query = "";
      const queryMatch =
        text.match(/about\s+["']([^"']+)["']/i) ||
        text.match(/about\s+([\w\s]+)(?=[\.,\?]|$)/i);
      if (queryMatch) {
        query = queryMatch[1].trim();
      }

      // Extract limit if present
      let userLimit = 10; // Default limit
      const limitMatch =
        text.match(/show\s+(\d+)/i) || text.match(/(\d+)\s+markets/i);
      if (limitMatch) {
        userLimit = parseInt(limitMatch[1], 10);
      }

      // If not in cache, fetch from service
      logger.info("Fetching markets from GammaService");
      const result = await GammaService.fetchMarkets();

      if (!result.success || !result.markets || result.markets.length === 0) {
        return `Sorry, I couldn't find any prediction markets${query ? ` about "${query}"` : ""}.${result.error ? ` ${result.error}` : ""}`;
      }

      let filteredMarkets = result.markets;
      if (query && query.trim() !== "") {
        const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const wordPattern = new RegExp(`\\b${escaped}\\b`, "i");

        filteredMarkets = result.markets.filter(
          (m) =>
            (m.question && wordPattern.test(m.question)) ||
            (m.description && wordPattern.test(m.description)) ||
            (m.slug && wordPattern.test(m.slug.replace(/-/g, " "))),
        );
      }

      const response = formatMarketsResponse(
        filteredMarkets.slice(0, userLimit),
        query,
      );
      const responseContent: Content = {
        text: response,
      };

      await callback(responseContent);

      return responseContent;
    } catch (error) {
      logger.error(error);
      return `Sorry, there was an error fetching prediction markets: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },
};

// Helper function to format markets response
function formatMarketsResponse(
  markets: ReadMarketsData["markets"],
  query?: string,
): string {
  if (markets.length === 0) {
    return `I couldn't find any prediction markets${query ? ` about "${query}"` : ""}.`;
  }

  const marketCount = markets.length;
  const queryText = query ? ` about "${query}"` : "";

  let response = `Here ${marketCount === 1 ? "is" : "are"} the top ${marketCount} prediction market${marketCount === 1 ? "" : "s"}${queryText} on Polymarket:\n`;

  markets.forEach((market, index) => {
    response += `${index + 1}. "${market.question}" - `;

    if (market.outcomes && market.outcomes.length > 0) {
      response += market.outcomes
        .map((outcome) => `${outcome.name}: $${outcome.price}`)
        .join(", ");
    } else {
      response += "No outcome data available";
    }

    if (index < markets.length - 1) {
      response += "\n";
    }
  });

  return response;
}
