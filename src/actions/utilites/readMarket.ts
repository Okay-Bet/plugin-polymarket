import {
  type Action,
  type IAgentRuntime,
  type Content,
  HandlerCallback,
  logger,
  Memory,
  State,
} from "@elizaos/core/v2";
import * as dotenv from "dotenv";
dotenv.config();
import { GammaService } from "../../services/gammaService";
import {
  GetMarketActionContent,
  PolymarketMarket,
  PolymarketRawMarketSchema,
  PolymarketSingleMarketApiResponse,
} from "../../types";
import { getMarketByIdExamples } from "src/examples";

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

const _transformMarketData = (rawMarket: any): any => {
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

  rawMarket.outcomes = processedOutcomes;
  return rawMarket;
};

export const readMarketAction: Action = {
  name: "GET_POLYMARKET_MARKET_BY_ID",
  similes: [
    "POLYMARKET_MARKET_FINDER",
    "SINGLE_MARKET_VIEWER",
    "MARKET_DETAIL_FETCHER",
  ],
  description:
    "Fetches and displays details for a specific Polymarket market by its ID",
  examples: [...getMarketByIdExamples],

  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[],
  ): Promise<string> => {
    try {
      const content = message.content as GetMarketActionContent;
      const text = content.text.trim();
      logger.info("content", content);

      const idPattern = /\b\d{6}\b/;
      const idMatch = text.match(idPattern);
      const marketId = idMatch ? idMatch[0] : "";
      logger.info("marketId", marketId);

      if (!marketId) {
        logger.info("marketId not found");
        return "Sorry, I couldn't identify a market ID in your request. Please specify a market ID.";
      }

      const result = await (process.env.NO_GAMMA
        ? fetchMarketById(marketId)
        : GammaService.fetchMarketById(marketId));

      if (!result.success || !result.market) {
        const errorMessage = `Sorry, I couldn't fetch details for market ID "${marketId}".${result.error ? ` Error: ${result.error}` : ""}`;
        logger.error(errorMessage);
        await callback({ text: errorMessage }); // Send error message to the user
        return errorMessage;
      }

      try {
        const responseContent: Content = {
          text: formatMarketResponse(result.market),
        };

        await callback(responseContent);

        return formatMarketResponse(result.market);
      } catch (e: any) {
        logger.error("Error during response formatting:", e);
        return `Sorry, I encountered an issue processing the market data: ${e.message}`;
      }
    } catch (error) {
      return `Sorry, there was an error fetching market details: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },
  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ): Promise<boolean> => {
    const content = message.content as GetMarketActionContent;
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
      text.includes("tell") ||
      text.includes("retriev") ||
      text.includes("market") ||
      text.includes("market prices");

    // Check for invalid action keywords
    const hasSkipActionKeywords = !(
      text.includes("lisitng") ||
      text.includes("list") ||
      text.includes("markets") ||
      text.includes("all"));

    return (
      hasActionKeywords && (hasPolymarketKeyword || hasPredictionMarketKeywords) && hasSkipActionKeywords
    );
  }
};

function formatMarketResponse(market: PolymarketMarket): string {
  let response = `Market "${market.question}" (ID: ${market.id})\n`;
  if (market.description) {
    response += `Description: ${market.description}\n`;
  }
  response += `Status: ${market.active ? "Active" : "Inactive"}${market.closed ? ", Closed" : ""}\n`;
  response += `Volume: ${market.volume.toLocaleString()}\n`;
  response += `Liquidity: ${market.liquidity.toLocaleString()}\n`;
  if (market.endDate) {
    response += `Ends: ${new Date(market.endDate).toLocaleDateString()}\n`;
  }

  if (market.outcomes && market.outcomes.length > 0) {
    response += "Outcomes:\n";
    response += market.outcomes
      .map((outcome) => `- ${outcome.name}: $${outcome.price}`)
      .join("\n");
  } else {
    response += "No outcome data available";
  }
  response += `\nURL: ${market.url}`;

  return response;
}

const apiUrl =
  process.env.API_URL || "https://gamma-api.polymarket.com/markets"; // Fallback if not in .env
