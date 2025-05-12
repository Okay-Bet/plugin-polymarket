import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type State,
    elizaLogger,
    HandlerCallback
} from "@elizaos/core";
import { GammaService } from "../services/gammaService";
import { GetMarketActionContent, PolymarketMarket } from "../types";

export const readMarketAction: Action = {
    name: "GET_POLYMARKET_MARKET_BY_ID",
    similes: [
        "POLYMARKET_MARKET_FINDER",
        "SINGLE_MARKET_VIEWER",
        "MARKET_DETAIL_FETCHER",
    ],
    description: "Fetches and displays details for a specific Polymarket market by its ID",
    examples: [
        [
          {
            name: "{{user1}}",
            content: { text: 'Show me details for Polymarket market 0x123abc...' },
          },
          {
            name: "{{agent}}",
            content: { text: 'Market "Will event X happen by date Y?" (ID: 0x123abc...)\nDescription: Detailed description of the market.\nStatus: Active\nVolume: 100000\nLiquidity: 50000\nEnds: 2024-12-31\nOutcomes:\n- Yes: $0.65\n- No: $0.35\nURL: https://polymarket.com/market/event-x-happen-by-date-y' },
          },
        ],
        [
          {
            name: "{{user1}}",
            content: { text: 'Get Polymarket data for 0x456def...' },
          },
          {
            name: "{{agent}}",
            content: { text: 'Market "Another interesting question?" (ID: 0x456def...)\nDescription: Some info about this market.\nStatus: Closed\nVolume: 75000\nLiquidity: 20000\nEnds: 2023-01-15\nOutcomes:\n- Option A: $0.80\n- Option B: $0.20\nURL: https://polymarket.com/market/another-interesting-question' },
          },
        ],
      ],
    
      validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
      ): Promise<boolean> => {
        // try {
        //   const content = message.content as GetMarketActionContent;
        //   const text = content.text.toLowerCase();
          
        //   const hasPolymarketKeyword = text.includes("polymarket");
        //   const hasMarketIdKeyword = text.includes("market id") || text.includes("id") || /0x[a-f0-9]{5,}/.test(text); // Basic check for hex-like ID

        //   const hasActionKeywords = 
        //     text.includes("show") || 
        //     text.includes("get") || 
        //     text.includes("find") || 
        //     text.includes("fetch") ||
        //     text.includes("detail");
          
        //   return hasActionKeywords && hasPolymarketKeyword && hasMarketIdKeyword;
        // } catch {
        //   return false;
        // }
        return true
      },
    
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
                const text = content.text;
        
                let marketId = content.marketId; // Check if ID is pre-filled

                if (!marketId) {
                    // Attempt to extract market ID using a regex (example: extracts hex-like strings)
                    // This regex looks for '0x' followed by at least 5 hex characters.
                    // It also tries to capture IDs mentioned after phrases like "market id", "id:", etc.
                    const idPattern = /(?:market id|id is|id:?|market)\s*([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}|0x[a-f0-9]{5,}[a-f0-9]*)/i;
                    const idMatch = text.match(idPattern);
                    if (idMatch && idMatch[1]) {
                        marketId = idMatch[1].trim();
                    } else {
                        // Fallback: try to extract any long hex-like string if specific patterns fail
                        const genericHexMatch = text.match(/(0x[a-f0-9]{10,})/i);
                        if (genericHexMatch && genericHexMatch[1]) {
                            marketId = genericHexMatch[1].trim();
                        } 
                    }
                }

                if (!marketId) {
                    return "Sorry, I couldn't identify a market ID in your request. Please specify a market ID.";
                }
                
                elizaLogger.log(`Fetching market with ID: ${marketId}`);
                const result = await GammaService.fetchMarketById(marketId);

                if (!result.success || !result.market) {
                  return `Sorry, I couldn't fetch details for market ID "${marketId}".${result.error ? ` Error: ${result.error}` : ""}`;
                }

                return formatMarketResponse(result.market);
            } catch (error) {
                return `Sorry, there was an error fetching market details: ${error instanceof Error ? error.message : "Unknown error"}`;
            }
        },
    };
    
    // Helper function to format a single market response
    function formatMarketResponse(market: PolymarketMarket): string {
      let response = `Market "${market.question}" (ID: ${market.id})\n`;
      if (market.description) {
        response += `Description: ${market.description}\n`;
      }
      response += `Status: ${market.active ? 'Active' : 'Inactive'}${market.closed ? ', Closed' : ''}\n`;
      response += `Volume: ${market.volume.toLocaleString()}\n`;
      response += `Liquidity: ${market.liquidity.toLocaleString()}\n`;
      if(market.endDate) {
        response += `Ends: ${new Date(market.endDate).toLocaleDateString()}\n`;
      }
      
      if (market.outcomes && market.outcomes.length > 0) {
        response += "Outcomes:\n";
        response += market.outcomes
          .map(outcome => `- ${outcome.name}: $${outcome.price.toFixed(2)}`)
          .join("\n");
      } else {
        response += "No outcome data available";
      }
      response += `\nURL: ${market.url}`;
      
      return response;
    }
