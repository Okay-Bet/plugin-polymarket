import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type State,
    elizaLogger
} from "@elizaos/core";
import { polymarketService } from "../services/polymarketService";
import { ReadMarketsActionContent, ReadMarketsData } from "../types";

export const readMarkets: Action = {
    name: "READ_POLYMARKET_MARKETS",
    similes: [
        "POLYMARKET_READER",
        "PREDICTION_MARKETS_VIEWER",
        "MARKET_DATA_FETCHER",
        "BETTING_ODDS_CHECKER",
    ],
    suppressInitialMessage: true,
    description: "Reads prediction markets data from Polymarket",
    examples: [
        [
          {
            user: "{{user1}}",
            content: { text: 'Show me the top prediction markets on Polymarket' },
          },
          {
            user: "{{agent}}",
            content: { text: 'Here are the top 5 prediction markets on Polymarket:\n1. "Will Trump win the 2024 election?" - Yes: 52%, No: 48%\n2. "Will Bitcoin exceed $100k in 2024?" - Yes: 35%, No: 65%\n3. "Will OpenAI release GPT-5 in 2024?" - Yes: 72%, No: 28%\n4. "Will SpaceX reach Mars by 2026?" - Yes: 15%, No: 85%\n5. "Will the Fed cut rates in June?" - Yes: 62%, No: 38%' },
          },
        ],
        [
          {
            user: "{{user1}}",
            content: { text: 'What are the current odds on Polymarket about Bitcoin?' },
          },
          {
            user: "{{agent}}",
            content: { text: 'I found 3 markets about Bitcoin on Polymarket:\n1. "Will Bitcoin exceed $100k in 2024?" - Yes: 35%, No: 65%\n2. "Will Bitcoin drop below $40k in May 2024?" - Yes: 22%, No: 78%\n3. "Will a Bitcoin ETF be approved in 2024?" - Yes: 89%, No: 11%' },
          },
        ],
      ],
    
      validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
      ): Promise<boolean> => {
        try {
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
            text.includes("tell");
          
          return hasActionKeywords && (hasPolymarketKeyword || hasPredictionMarketKeywords);
        } catch {
          return false;
        }
      },
    
      handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
      ): Promise<string> => {
            try {
                elizaLogger.log("Composing state for message:", message);
                state = (await runtime.composeState(message)) as State;
                const userId = runtime.agentId;
                elizaLogger.log("User ID:", userId);
                const content = message.content as ReadMarketsActionContent;
                const text = content.text;
        
                // Extract query if present
                let query = "";
                const queryMatch = text.match(/about\s+["']([^"']+)["']/i) || text.match(/about\s+([\w\s]+)(?=[\.,\?]|$)/i);
                if (queryMatch) {
                    query = queryMatch[1].trim();
                }
                
                // Extract limit if present
                let limit = 5; // Default limit
                const limitMatch = text.match(/show\s+(\d+)/i) || text.match(/(\d+)\s+markets/i);
                if (limitMatch) {
                limit = parseInt(limitMatch[1], 10);
                }
                
                // Check if we only want active markets
                const activeOnly = !text.toLowerCase().includes("inactive") && 
                                !text.toLowerCase().includes("all markets");

                // If not in cache, fetch from service
                const result = await polymarketService.fetchMarkets({
                limit,
                activeOnly,
                query,
                });

                if (!result.success || !result.markets || result.markets.length === 0) {
                return `Sorry, I couldn't find any prediction markets${query ? ` about "${query}"` : ""}. ${result.error || ""}`;
                }

                return formatMarketsResponse(result.markets, query);
            } catch (error) {
                return `Sorry, there was an error fetching prediction markets: ${error instanceof Error ? error.message : "Unknown error"}`;
            }
        },
    };
    
    // Helper function to format markets response
    function formatMarketsResponse(markets: ReadMarketsData["markets"], query?: string): string {
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
            .map(outcome => `${outcome.name}: ${Math.round(outcome.probability * 100)}%`)
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