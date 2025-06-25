import {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  Content,
  logger,
  UUID,
  composePromptFromState,
  ModelType,
} from "@elizaos/core/v2";
import * as dotenv from "dotenv";
dotenv.config();
import { ClobService } from "../../services/clobService";
import { ReadMarketsActionContent, ReadMarketsData } from "../../types";
import { readMarketsModel } from "../../models";
import { getMarketsExamples } from "../../examples";
import { GammaService } from "../../services/gammaService";

export const readMarketsAction: Action = {
  name: "READ_POLYMARKET_MARKETS",
  similes: [
    "POLYMARKET_READER",
    "PREDICTION_MARKETS_VIEWER",
    "MARKET_DATA_FETCHER",
    "BETTING_ODDS_CHECKER",
  ],
  description: "Reads prediction markets data from Polymarket",
  examples: [...getMarketsExamples],

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
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
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[]
  ) => {
    try {
      const content = message.content as ReadMarketsActionContent;
      const text = content.text;

      const prompt = composePromptFromState({
        state,
        template: readMarketsModel,
      });
      let reflection = "";
      reflection = await runtime.useModel(ModelType.TEXT_LARGE, {
        prompt,
      });

      logger.info("Reflection from model:", reflection); // Log the reflection output

      // Extract query if present
      let query = "";
      const queryMatch =
        text.match(/about\s+["']([^"']+)["']/i) ||
        text.match(/about\s+([\w\s]+)(?=[\.,\?]|$)/i);
      if (queryMatch) {
        query = queryMatch[1].trim();
      }

      // Extract limit if present
      let userLimit = 20; // Default limit
      const limitMatch =
        text.match(/show\s+(\d+)/i) || text.match(/(\d+)\s+markets/i);
      if (limitMatch) {
        userLimit = parseInt(limitMatch[1], 10);
      }

      // If not in cache, fetch from service
      logger.info(
        `Fetching markets from GammaService with query: "${query}" and limit: ${userLimit}`,
      );

      // Use ClobService to fetch markets
      const clobService = runtime.getService(ClobService.serviceType) as ClobService; 
      const sdk = clobService.getSDK();
      const markets = await sdk.market.getAll().then((res: any) => res.markets);
      const result = { success: true, markets };

      if (!result.success || !result.markets || result.markets.length === 0) {
        const errorMessage = `Sorry, I couldn't find any prediction markets${query ? ` about "${query}"` : ""}.${result.error ? ` ${result.error}` : ""}`;
        logger.error(errorMessage);
        return errorMessage; 
      }

      const response = formatMarketsResponse(
        result.markets,
        query,
      );
      logger.info("Response from formatMarketsResponse:", response);
      const responseContent = {
        // Here we are adding the "#" to the text for test
        text: response
      } as Content; 
      await callback(responseContent); 

      return responseContent.text;
    } catch (error: any) {
      logger.error(error);
      return `Sorry, there was an error fetching prediction markets: ${error instanceof Error ? error.message : "Unknown error"}. Please try again later.`;
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

  let response = `#Here ${marketCount === 1 ? "is" : "are"} the top ${marketCount} prediction market${marketCount === 1 ? "" : "s"}${queryText} on Polymarket:\n`;

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
      response += "\n"; // For api test to work we need "#"
    }
  });

  return response;
}
