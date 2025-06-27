import {
  type IAgentRuntime,
  type Action,
  type Memory,
  type State,
  type HandlerCallback,
  logger,
  Content,
} from "@elizaos/core/v2";
import { ClobService } from "../../services/clobService"; // Ensure correct path
import { Side } from "@polymarket/order-utils";
import { OrderType, AssetType } from "@polymarket/clob-client";
import { sellSharesExamples } from "../../examples";
import { GammaService } from "../../services/gammaService";
import { SellSharesActionContent, OrderParams } from "../../types";

export const sellSharesAction: Action = {
  name: "SELL_SHARES",
  similes: ["SELL_SHARES"],
  description: "Sells x number shares in a specified Polymarket market.",
  examples: [...sellSharesExamples],
  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ): Promise<boolean> => {
    const content = message.content as SellSharesActionContent;
    if (!content || !content.text) {
      return false;
    }
    
    const text = content.text.toLowerCase();
    
    const hasSellKeywords = 
      text.includes("sell") || 
      text.includes("exit") || 
      text.includes("close position");
    
    const hasMarketKeywords =
      text.includes("market") ||
      text.includes("shares") ||
      text.includes("position") ||
      /\d{6}/.test(text); // Checks for market ID pattern
    
    return hasSellKeywords && hasMarketKeywords;
  },

  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback
  ): Promise<string> => {
    const content = message.content as SellSharesActionContent;
    const text = content.text.trim();
    
    // Extract market ID
    const marketIdPattern = /\b\d{6}\b/;
    const marketIdMatch = text.match(marketIdPattern);
    const marketId = marketIdMatch ? marketIdMatch[0] : content.marketId;
    
    if (!marketId) {
      return "Sorry, I couldn't identify a market ID in your request. Please specify a market ID.";
    }
    
    // First fetch market details to verify market exists and to display details later
    const marketResult = await GammaService.fetchMarketById(marketId);
    if (!marketResult.success || !marketResult.market) {
      return `Sorry, I couldn't find a market with ID ${marketId}. ${marketResult.error || ''}`;
    }
    
    // Extract outcome (YES/NO)
    const outcomePattern = /\b(yes|no)\b/i;
    const outcomeMatch = text.match(outcomePattern);
    const outcome = outcomeMatch ? outcomeMatch[0].toUpperCase() : content.outcomeId;
    
    if (!outcome) {
      return `Please specify which outcome you want to sell (YES or NO) for market "${marketResult.market.question}".`;
    }
    
    // Extract amount
    const amountPattern = /\b(\d+(?:\.\d+)?)\s*(?:USD|USDC|dollars|$)?\b/;
    const amountMatch = text.match(amountPattern);
    const amount = amountMatch ? amountMatch[1] : content.amount;
    
    if (!amount) {
      return `Please specify the amount you want to sell of ${outcome} shares for market "${marketResult.market.question}".`;
    }
    
    // Extract price
    const pricePattern = /(?:price|at)\s*(?:\$)?(\d+(?:\.\d+)?)/i;
    const priceMatch = text.match(pricePattern);
    const price = priceMatch ? priceMatch[1] : content.price;
    
    if (!price) {
      return `Please specify the price at which you want to sell ${outcome} shares for market "${marketResult.market.question}".`;
    }
    
    // Log the extracted parameters for debugging
    logger.info(`Selling ${amount} USD of ${outcome} in market ${marketId} at price ${price}`);
    
    // Place the order through the CLOB API
    const result = await ClobService.placeOrder(
      {
        marketId,
        outcomeId: outcome,
        side: "SELL",
        amount,
        price,
        orderType: "LIMIT",
      } as OrderParams,
    );
    
    const responseContent: Content = {
      text: result.success 
        ? `Order placed successfully! You have sold ${amount} USD worth of ${outcome} shares in market "${marketResult.market.question}" (ID: ${marketId}) at price $${price} per share. ${result.message || ''}`
        : `Sorry, there was an error placing your sell order: ${result.error}`
    };
    
    await callback(responseContent);
    
    return responseContent.text || "";
  }
};