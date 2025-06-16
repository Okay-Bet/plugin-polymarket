import {
  type IAgentRuntime,
  type Action,
  type Memory,
  type State,
  type Content,
  type HandlerCallback,
} from "@elizaos/core";
import { ClobService } from "../../services/clobService"; // Ensure correct path
import { Side, OrderType } from "@polymarket/clob-client";
import { ethers } from "ethers";

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

    const clobService = _runtime.getService(ClobService.serviceType) as ClobService;
    if (!clobService) {
      return "ClobService not available. Please check plugin configuration.";
    }

    const clobClient = clobService.getClobClient();

    // Assume marketId is the token ID for simplicity, needs adjustment for real mapping
    const tokenID = marketId;
    const price = 0.5; // Placeholder.  You will likely need to fetch this from market data.
    const side = outcome === "Yes" ? Side.SELL : Side.SELL; // Assuming selling "Yes". Adapt for "No" if needed.

    try {
      const order = await clobClient.createOrder({
        tokenID,
        price,
        side,
        size: quantity,
        feeRateBps: 0, // Assuming no fees for now
        nonce: Math.floor(Math.random() * 1000000),
      });

      const resp = await clobClient.postOrder(order, OrderType.GTC);
      const responseText = `Successfully placed a sell order for ${quantity} shares of "${outcome}" in market ${marketId}. Order details: ${JSON.stringify(resp)}`;
      await callback({ text: responseText });
      return responseText
    } catch (e) {
      return `Error selling shares: ${e instanceof Error ? e.message : "Unknown error"}`;
    }
  },
};
