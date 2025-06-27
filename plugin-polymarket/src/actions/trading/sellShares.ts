import {
  type IAgentRuntime,
  type Action,
  type Memory,
    type State,
  HandlerCallback,
} from "@elizaos/core/v2";
import { ClobService } from "../../services/clobService"; // Ensure correct path
import { sellSharesExamples } from "src/examples";
import { OrderParams } from "src/types";

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

    const clobService = _runtime.getService(
      ClobService.serviceType,
    ) as ClobService;
    if (!clobService) {
      return "ClobService not available. Please check plugin configuration.";
    }

    try {
        const orderParams: OrderParams = {
            marketMakerAddress: "0xMarketMakerAddress", // Replace with actual value
            conditionalTokensAddress: "0xConditionalTokensAddress", // Replace with actual value
            returnAmount: quantity, // Assuming quantity maps to returnAmount, adjust as needed
            outcomeIndex: outcome === "Yes" ? 0 : 1, // Assuming 0 for "Yes", 1 for "No"
            maxOutcomeTokensToSell: quantity, // Assuming quantity maps to maxOutcomeTokensToSell, adjust as needed
        };

        const result = await clobService.sellSharesSDK(orderParams);
      const message = result.message || "Sell order processed.";
      await callback({ text: message });
      return message;
    } catch (error) {
      return `Error selling shares: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },
} as Action;
