import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type State,
    type HandlerCallback,
    elizaLogger
} from "@elizaos/core";
import { PolymarketService } from "../services/polymarketService.js";
import { ReadMarketsActionContent, ReadMarketsData } from "../types.js";

export const readMarkets: Action = {
    name: "READ_POLYMARKET_MARKETS",
    similes: [
        "POLYMARKET_READER",
        "PREDICTION_MARKETS_VIEWER",
        "MARKET_DATA_FETCHER",
        "BETTING_ODDS_CHECKER",
    ],
    // suppressInitialMessage: true,
    description: "Reads prediction markets data from Polymarket",
    examples: [
        [
            {
              content: { text: 'Show me the top prediction markets on Polymarket' },
              name: ""
            },
            {
              content: {
                text: 'Here are the top 5 prediction markets on Polymarket:\n1. "Will Trump win the 2024 election?" - Yes: $0.52, No: $0.48\n2. "Will Bitcoin exceed $100k in 2024?" - Yes: $0.35, No: $0.65\n3. "Will OpenAI release GPT-5 in 2024?" - Yes: $0.72, No: $0.28\n4. "Will SpaceX reach Mars by 2026?" - Yes: $0.15, No: $0.85\n5. "Will the Fed cut rates in June?" - Yes: $0.62, No: $0.38',
                actions: ['READ_POLYMARKET_MARKETS']
              },
              name: ""
            }
        ],
        [
            {
              content: { text: 'What are the current odds on Polymarket about Bitcoin?' },
              name: ""
            },
            {
              content: {
                text: 'I found 3 markets about Bitcoin on Polymarket:\n1. "Will Bitcoin exceed $100k in 2024?" - Yes: $0.35, No: $0.65\n2. "Will Bitcoin drop below $40k in May 2024?" - Yes: $0.22, No: $0.78\n3. "Will a Bitcoin ETF be approved in 2024?" - Yes: $0.89, No: $0.11',
                actions: ['READ_POLYMARKET_MARKETS']
              },
              name: ""
            }
        ]
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
        } catch (error) {
            elizaLogger.error('Error validating readMarkets action:', error);
            return false;
        }
    },
    
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: any,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            elizaLogger.debug("Composing state for message:", message);
            state = (await runtime.composeState(message)) as State;
            const userId = runtime.agentId;
            elizaLogger.debug("User ID:", userId);
            
            const content = message.content as ReadMarketsActionContent;
            const text = content.text;
    
            // Extract query if present
            let query = "";
            
            // Try multiple patterns to extract search terms
            const patterns = [
                // "about X" pattern
                /about\s+["']([^"']+)["']/i,
                /about\s+([\w\s]+?)(?=[\.,\?]|$)/i,
                
                // "X market" or "X prediction" patterns
                /([\w\s]+?)\s+(?:prediction\s+)?market/i,
                /([\w\s]+?)\s+prediction/i,
                
                // "fed decision", "election", "weather", etc.
                /(?:tell me about|show me|find|get)\s+([\w\s]+?)(?:[\.,\?]|$)/i,
                
                // Direct topics: "weather", "sports", "election", "fed decision"
                /^(weather|sports?|election|fed\s+decision|bitcoin|crypto|trump|biden|[\w\s]*election[\w\s]*|[\w\s]*fed[\w\s]*|[\w\s]*rate[\w\s]*|[\w\s]*weather[\w\s]*|[\w\s]*sports[\w\s]*)[\s\.,\?]*$/i
            ];
            
            for (const pattern of patterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    query = match[1].trim();
                    // Clean up common words from the beginning/end
                    query = query.replace(/^(a|an|the|some|any)\s+/i, '');
                    query = query.replace(/\s+(in|on|at|about)$/i, '');
                    break;
                }
            }
            
            // If no specific pattern matched, try to extract meaningful keywords
            if (!query) {
                const keywords = text.match(/\b(weather|sports?|election|fed|federal|reserve|rate|bitcoin|crypto|trump|biden|climate|temperature|rain|snow|football|basketball|soccer|tennis|politics|vote|voting|candidate|president|governor|senate|house)\b/gi);
                if (keywords && keywords.length > 0) {
                    query = keywords.join(" ");
                }
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

            // Get service instance from runtime
            const polymarketService = runtime.getService("polymarket") as PolymarketService;
            if (!polymarketService) {
                throw new Error("Polymarket service not available");
            }

            // Get response from service
            const result = await polymarketService.fetchMarkets({
                limit,
                activeOnly,
                query,
            });

            if (!result.success || !result.markets || result.markets.length === 0) {
                const response = {
                    thought: `No markets found${query ? ` for query "${query}"` : ""}. ${result.error || ""}`,
                    text: `Sorry, I couldn't find any prediction markets${query ? ` about "${query}"` : ""}.${result.error ? ` ${result.error}` : ""}`,
                    actions: ['READ_POLYMARKET_MARKETS']
                };
                
                if (callback) {
                    await callback(response);
                }
                return true;
            }

            const formattedResponse = formatMarketsResponse(result.markets, query);
            
            const response = {
                thought: `Successfully retrieved and formatted ${result.markets.length} markets${query ? ` about "${query}"` : ""}.`,
                text: formattedResponse,
                actions: ['READ_POLYMARKET_MARKETS']
            };

            if (callback) {
                await callback(response);
            }
            return true;

        } catch (error) {
            const errorResponse = {
                thought: `Error occurred while fetching markets: ${error instanceof Error ? error.message : "Unknown error"}`,
                text: `Sorry, there was an error fetching prediction markets: ${error instanceof Error ? error.message : "Unknown error"}`,
                actions: ['READ_POLYMARKET_MARKETS']
            };
            
            if (callback) {
                await callback(errorResponse);
            }
            elizaLogger.error('Error in readMarkets handler:', error);
            return false;
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
                .map(outcome => `${outcome.name}: $${outcome.price.toFixed(2)}`)
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