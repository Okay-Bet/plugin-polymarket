import {
  type IAgentRuntime,
  type Action,
  type Memory,
    type State,
  HandlerCallback,
  logger,
} from "@elizaos/core/v2";
import { PolymarketService } from "../../services/polymarketService"; // Ensure correct path
import { sellSharesExamples } from "src/examples";
import { OrderParams } from "src/types";
import { ethers } from "ethers";

export const sellSharesAction: Action = {
  name: "SELL_SHARES",
  similes: ["SELL_SHARES"],
  description: "Sells x number shares in a specified Polymarket market.",
  examples: [...sellSharesExamples],
  validate: async (params: any) => {
    return (
      params.marketId &&
      params.outcome &&
      typeof params.quantity === "number" &&
      params.quantity > 0 &&
      (params.outcome === "Yes" || params.outcome === "No")
    );
  },
  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[],
  ): Promise<string> => {
    const { marketId, outcome, quantity } = _options;

    if (!marketId || !outcome || !quantity) {
      return "Invalid input: Please provide marketId, outcome (Yes/No), and quantity.";
    }

    const polymarketService = _runtime.getService(
      PolymarketService.serviceType,
    ) as PolymarketService;
    if (!polymarketService) {
      return "PolymarketService not available. Please check plugin configuration.";
    }

    try {
        const marketDataResponse = await PolymarketService.fetchMarketById(marketId);

        if (!marketDataResponse.success || !marketDataResponse.market) {
            return `Could not retrieve market data for market ID: ${marketId}. ${marketDataResponse.error}`;
        }

        const marketData = marketDataResponse.market;

        const outcomeIndex = marketData.outcomes.findIndex(o => o.name === outcome);

        if (outcomeIndex === -1) {
            return `Could not find condition matching outcome: ${outcome}`;
        }

        const clobTokenId = marketData.outcomes[outcomeIndex].clobTokenId;

        if (!clobTokenId) {
            return `Could not find clobTokenId for outcome: ${outcome}`;
        }

        const orderParams: OrderParams = {
            marketMakerAddress: "0x9e7E27aA1D9d4418E3fA5134aA2aB14446483584", // This is a placeholder, you should have a way to get this value
            conditionalTokensAddress: "0x4e35122252a3bA8A5296A63aB4a31545539B334f", // This is a placeholder, you should have a way to get this value
            returnAmount: ethers.utils.parseUnits(quantity.toString(), 6),
            outcomeIndex: outcomeIndex,
            maxOutcomeTokensToSell: ethers.utils.parseUnits(quantity.toString(), 6),
        };

        const result = await polymarketService.sellSharesSDK(orderParams);
      const message = result.message || "Sell order processed.";
      await callback({ text: message });
      return message;
    } catch (error: any) {
      return `Error selling shares: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },
} as Action;
