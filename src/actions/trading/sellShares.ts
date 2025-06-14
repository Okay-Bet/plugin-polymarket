import {
  type IAgentRuntime,
  type Action,
  type Memory,
  type State,
  type Content,
  type HandlerCallback,
} from "@elizaos/core";
import { GammaService } from "../../services/gammaService";

export const sellSharesAction: Action = {
  name: "SELL_SHARES",
  similes: ["SELL_SHARES"],
  description: "Sells x number shares in a specified Polymarket market.",
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: 'Sell 5 shares of "Yes" in market 123' },
      },
      {
        name: "{{agent}}",
        content: { text: 'Attempting to sell 5 shares of "Yes" in market 123' },
      },
    ],
  ],
  validate: async (params: any) => {
    return (
      params.marketId &&
      params.outcome &&
      typeof params.quantity === "number" &&
      params.quantity > 0
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
        const orderParams: OrderParams = {
            marketMakerAddress: "0xMarketMakerAddress", // Replace with actual value
            conditionalTokensAddress: "0xConditionalTokensAddress", // Replace with actual value
            returnAmount: quantity, // Assuming quantity maps to returnAmount, adjust as needed
            outcomeIndex: outcome === "Yes" ? 0 : 1, // Assuming 0 for "Yes", 1 for "No"
            maxOutcomeTokensToSell: quantity, // Assuming quantity maps to maxOutcomeTokensToSell, adjust as needed
        };

        const result = await polymarketService.sellSharesSDK(orderParams);
      const message = result.message || "Sell order processed.";
      await callback({ text: message });
      return message;
    } catch (error) {
      return `Error selling shares: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },
};
