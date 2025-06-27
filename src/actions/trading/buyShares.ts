import {
  type IAgentRuntime,
  type Action,
  type Memory,
  type State,
  HandlerCallback,
  logger,
} from "@elizaos/core/v2";
import { ClobService } from "../../services/clobService"; // Ensure correct path
import { buySharesExamples } from "src/examples";
import { OrderParams } from "src/types";

export const buySharesAction: Action = {
  name: "BUY_SHARES",
  similes: ["BUY_SHARES"],
  description: "Buys x number of shares in a specified Polymarket market.",
  examples: [...buySharesExamples],
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
    _responses: Memory[]
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
      // Assuming you have a way to fetch market data and get the required addresses
      const marketData = await ClobService.fetchMarketById(marketId);

      if (!marketData) {
        return `Could not retrieve market data for market ID: ${marketId}`;
      }

      logger.info("marketData:", marketData);  // Added logging
      logger.info("outcome:", outcome);          // Added logging

      // Assuming outcome relates to a condition's humanReadableName
      const condition = marketData.market.conditions.find(
        (c) => c.humanReadableName === outcome // Adjust if needed, based on actual relationship
      );

      if (!condition) {
        return `Could not find condition matching outcome: ${outcome}`;
      }
      const orderParams: OrderParams = {
        marketMakerAddress: marketData.market.marketMakerAddress,
        conditionalTokensAddress: condition.conditionalTokensAddress, // Assuming this is correct
        returnAmount: quantity,
        //  NOTE: outcomeIndex might not be directly related to "Yes"/"No" in this structure.
        outcomeIndex:  outcome === "Yes" ? 0 : 1, //  You likely need logic to determine this from conditions.
        maxOutcomeTokensToSell: quantity,
      };

      const result = await clobService.buySharesSDK(orderParams);

      const message = result.message || "Buy order processed.";
      await callback({ text: message });
      return message;
    } catch (error) {
      return `Error buying shares: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },
} as Action;
