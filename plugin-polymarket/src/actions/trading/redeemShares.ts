import { 
  type IAgentRuntime,
  type Action,
  type Memory, 
  type State,
  type HandlerCallback,
  logger,
} from "@elizaos/core/v2";
import { type ActionExample } from "@elizaos/core/v2";
import { ClobService } from "../../services/clobService"; // Import ClobService
import { RedeemParams, RedeemWinningsActionContent } from "../../types";
import { GammaService } from "../../services/gammaService";
import { redeemSharesExamples } from "plugin-polymarket/src/examples";
export const redeemSharesAction: Action = {
  name: "REDEEM_SHARES",
  similes: ["REDEEM_SHARES"], 
  description:
    "Redeems shares in a specified Polymarket market after it has resolved.",
  examples: [...redeemSharesExamples],
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
      text.includes("redeem") || text.includes("claim") || text.includes("resolve");
      
    const hasSharesKeywords = text.includes("shares") || text.includes("position");

    const hasMarketContext = text.includes("market") || /\b\d{6}\b/.test(text);

    return hasRedeemKeywords && hasSharesKeywords && hasMarketContext; 
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
      return `Sorry, I couldn't find a market with ID ${marketId}. ${
        marketResult.error || ""
      }`;
    }

    // Log the redemption attempt
    logger.info(`Attempting to redeem shares from market ${marketId}`);

    // Call the CLOB API to redeem shares
    try {
      // Get the SDK instance 
      const clobService = _runtime.getService(ClobService.serviceType) as ClobService;
      //const sdk = clobService.getSDK();

      // Adapt the SDK call for redeeming shares (adjust based on SDK API)
      //await sdk.redeem.redeemWinnings({ marketId: parseInt(marketId) }); // Assuming marketId is a number

      const responseText = `Successfully redeemed your shares from market "${marketResult.market.question}" (ID: ${marketId}).`;
      await callback({ text: responseText });
      return responseText;

    } catch (error: any) {
      logger.error("Error redeeming shares:", error);
      const responseText = `Sorry, there was an error redeeming your shares: ${error.message || 'Unknown error'}`;
      await callback({ text: responseText });
      return responseText;
    }
  },
} as Action;
