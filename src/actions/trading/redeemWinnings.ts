import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type Content,
  elizaLogger,
  HandlerCallback,
  logger
} from "@elizaos/core/v2";
import { ClobService } from "../../services/clobService";
import { RedeemParams, RedeemWinningsActionContent } from "../../types";

export const redeemWinningsAction: Action = {
  name: "POLYMARKET_REDEEM_WINNINGS",
  similes: [
    "claim winnings",
    "redeem payout",
    "collect earnings",
    "collect rewards"
  ],
  description: "Redeems winnings from resolved Polymarket markets",
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: 'Redeem my winnings from market 138462' },
      },
      {
        name: "{{agent}}",
        content: { text: 'Successfully redeemed your winnings from market "Will event X happen?". You received 75 USDC.' },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: { text: 'Claim all my winnings from resolved markets' },
      },
      {
        name: "{{agent}}",
        content: { text: 'Successfully redeemed your winnings from all resolved markets. You received a total of 120 USDC.' },
      },
    ],
  ],
  
  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ): Promise<boolean> => {
    const content = message.content as RedeemWinningsActionContent;
    if (!content || !content.text) {
      return false;
    }
    
    const text = content.text.toLowerCase();
    
    const hasRedeemKeywords = 
      text.includes("redeem") || 
      text.includes("claim") || 
      text.includes("collect") ||
      text.includes("winnings") ||
      text.includes("rewards") ||
      text.includes("payout") ||
      text.includes("earnings");
    
    return hasRedeemKeywords;
  },

  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[]
  ): Promise<string> => {
    const content = message.content as RedeemWinningsActionContent;
    const text = content.text.trim();
    
    // Check if a specific market ID is provided
    const marketIdPattern = /\b\d{6}\b/;
    const marketIdMatch = text.match(marketIdPattern);
    const marketId = marketIdMatch ? marketIdMatch[0] : content.marketId;
    
    // If market ID is provided, verify it exists
    let marketName = "all resolved markets";
    if (marketId) {
      const marketResult = await ClobService.fetchMarketById(marketId);
      if (!marketResult.success || !marketResult.market) {
        return `Sorry, I couldn't find a market with ID ${marketId} to redeem winnings from. ${marketResult.error || ''}`;
      }
      marketName = `"${marketResult.market.question}"`;
    }
    
    // Log the redemption attempt
    logger.info(`Attempting to redeem winnings${marketId ? ` from market ${marketId}` : ' from all resolved markets'}`);
    
    // Call the CLOB API to redeem winnings
    const result = await ClobService.redeemUserPositions({
      // These values are placeholders and need to be replaced with actual values
      conditionalTokensAddress: "0x0000000000000000000000000000000000000000", 
      collateralTokenAddress: "0x0000000000000000000000000000000000000000", 
      conditionId: "0", 
      outcomeSlotCount: 1 
    });
    
    const responseContent: Content = {
      text: result.success
        ? `Successfully redeemed your winnings from ${marketName}. Transaction details: ${JSON.stringify(
            result.transactionDetails
          )}` // Update success message
        : `Sorry, there was an error redeeming your winnings: ${result.error}`
    };
    
    await callback(responseContent);
    
    return responseContent.text;
  }
};
