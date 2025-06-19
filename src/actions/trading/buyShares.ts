  import {
  type IAgentRuntime,
  type Action,
  type Memory,
  type State,
  type Content,
  type HandlerCallback,
} from "@elizaos/core/v2";
import { ClobService } from "../../services/clobService"; // Ensure correct path
import { Side, OrderType } from "@polymarket/clob-client";
import { ethers } from "ethers";
import { buySharesExamples } from "src/examples";

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
      const errorMsg =  "Invalid input: Please provide marketId, outcome (Yes/No), and quantity.";
      await callback({ text: errorMsg });
      return errorMsg
    }

    const clobService = _runtime.getService(
      ClobService.serviceType,
    ) as ClobService;
    if (!clobService) {
      return "ClobService not available. Please check plugin configuration.";
    }

    const clobClient = clobService.getClobClient();
    
    //  THIS SHOULD BE ADDED TO ALL THE ACTIONS THAT REQUIRE WALLET
    // Ensure wallet is connected
    /*if (!clobService.isWalletConnected()) {
      // Assuming there's a way to check if the wallet is connected
      //  You'll need to implement this in ClobService
      await clobService.connectWallet(userProvidedPrivateKey); // Get from user input
    }
     */

    // Assume marketId is the token ID for simplicity, needs adjustment for real mapping
    const tokenID = marketId;
    const price = 0.5; // Placeholder.  You will likely need to fetch this from market data.
    const side = outcome === "Yes" ? Side.BUY : Side.BUY; // Assuming buying "Yes". Adapt for "No" if needed.
    // Placeholder to see if I can avoid a compilation issue
    try {
      const order = await clobClient.createOrder({
        tokenID,
        price,
        side,
        size: quantity,
        feeRateBps: 0, // Assuming no fees for now
        nonce: Math.floor(Math.random() * 1000000),
      });

      // Add logging to inspect the order object
      console.log("Order object before posting:", JSON.stringify(order, null, 2));
      if (!order)
        return 'order does not exist';

      const resp = await clobClient.postOrder(order, OrderType.GTC);
      const responseText = `Successfully placed a buy order for ${quantity} shares of "${outcome}" in market ${marketId}. Order details: ${JSON.stringify(resp)}`;
      await callback({ text: responseText });
      return responseText;
    } catch (e) {
      return `Error buying shares: ${e instanceof Error ? e.message : "Unknown error"}`;
    }
  },
};
