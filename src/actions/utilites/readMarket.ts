import {
  type Action,
  type IAgentRuntime,
  type Content,
  HandlerCallback,
  logger,
  Memory,
  State,
} from "@elizaos/core/v2";
import { GammaService } from "../../services/gammaService";
import { GetMarketActionContent, PolymarketMarket } from "../../types";
import { getMarketByIdExamples } from "src/examples";

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

      const result = await GammaService.fetchMarketById(marketId);

      if (!result.success || !result.market) {
        return `Sorry, I couldn't fetch details for market ID "${marketId}".${result.error ? ` Error: ${result.error}` : ""}`;
      }

      const responseContent: Content = {
        text: formatMarketResponse(result.market),
      };

      await callback(responseContent);

      return formatMarketResponse(result.market);
    } catch (error) {
      return `Sorry, there was an error fetching market details: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },
  validate: function (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ): Promise<boolean> {
    throw new Error("Function not implemented.");
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
