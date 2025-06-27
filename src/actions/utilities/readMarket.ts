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
import { ClobService } from "../../../plugin-polymarket/src/services/clobService";
import {
  GetMarketActionContent,
  PolymarketMarket,
} from "../../types";
import { getMarketByIdExamples } from "../../../plugin-polymarket/src/examples";

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
    _responses: Memory[]
  ): Promise<string> => {
    try {
      const content = message.content as GetMarketActionContent;
      const text = content.text.trim();
      logger.info("content", content);

      const idPattern = /\b(\d+)\b/;
      const idMatch = text.match(idPattern);
      const marketId = idMatch ? idMatch[1] : "";
      logger.info("marketId", marketId);

      if (!marketId) {
        logger.info("marketId not found");
        return "Sorry, I couldn't identify a market ID in your request. Please specify a market ID.";
      }

      const result = await (ClobService.fetchMarketById(marketId));
      logger.debug(result.toString());
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

        return responseContent.text;
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
      text.includes("lisitngs") ||
      text.includes("lists") ||
      text.includes("markets")
    );

    return true || (
      hasActionKeywords &&
      (hasPolymarketKeyword || hasPredictionMarketKeywords) &&
      hasSkipActionKeywords
    );
  },
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
