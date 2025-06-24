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
import { buySharesExamples } from "src/examples";
import { GammaService } from "src/services/gammaService";
import { BuySharesActionContent, OrderParams } from "src/types";

export const buySharesAction: Action = {
  name: "BUY_SHARES",
  similes: ["BUY_SHARES"],
  description: "Buys x number of shares in a specified Polymarket market.",
  examples: [...buySharesExamples],
  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ): Promise<boolean> => {
    const content = message.content as BuySharesActionContent;
    if (!content || !content.text) {
      return false;
    }
    
    const text = content.text.toLowerCase();
    
    const hasBuyKeywords = 
      text.includes("buy") || 
      text.includes("purchase") || 
      text.includes("invest");
    
    const hasMarketKeywords =
      text.includes("market") ||
      text.includes("shares") ||
      text.includes("outcome") ||
      /\d{6}/.test(text); // Checks for market ID pattern
    
    return hasBuyKeywords && hasMarketKeywords;
  },

  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[]
  ): Promise<string> => {
    const content = message.content as BuySharesActionContent;
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
      return `Please specify which outcome you want to buy (YES or NO) for market "${marketResult.market.question}".`;
    }
    
    // Extract amount
    const amountPattern = /\b(\d+(?:\.\d+)?)\s*(?:USD|USDC|dollars|$)?\b/;
    const amountMatch = text.match(amountPattern);
    const amount = amountMatch ? amountMatch[1] : content.amount;
    
    if (!amount) {
      return `Please specify the amount you want to invest in ${outcome} shares for market "${marketResult.market.question}".`;
    }
    
    // Extract price
    const pricePattern = /(?:price|at)\s*(?:\$)?(\d+(?:\.\d+)?)/i;
    const priceMatch = text.match(pricePattern);
    const price = priceMatch ? priceMatch[1] : content.price;
    
    if (!price) {
      return `Please specify the price at which you want to buy ${outcome} shares for market "${marketResult.market.question}".`;
    }
    
    // Log the extracted parameters for debugging
    logger.info(`Buying ${amount} USD of ${outcome} in market ${marketId} at price ${price}`);
    
    // Place the order through the CLOB API
    const result = await ClobService.placeOrder(
      {
        marketId,
        outcomeId: outcome,
        side: "BUY",
        amount,
        price,
        orderType: "LIMIT",
      } as OrderParams,
    );
    
    const responseContent: Content = {
      text: result.success 
        ? `Order placed successfully! You have bought ${amount} USD worth of ${outcome} shares in market "${marketResult.market.question}" (ID: ${marketId}) at price $${price} per share. ${result.message || ''}`
        : `Sorry, there was an error placing your order: ${result.error}`
    };
    
    await callback(responseContent);
    
    return responseContent.text;
  }
};
