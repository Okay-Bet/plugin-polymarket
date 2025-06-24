import {
  type IAgentRuntime,
  type Action,
  type Memory,
  type State,
  type HandlerCallback,
} from "@elizaos/core/v2";
import { ClobService } from "../../services/clobService"; // Ensure correct path
import { redeemSharesExamples } from "src/examples";

export const redeemSharesAction: Action = {
  name: "REDEEM_SHARES",
  similes: ["REDEEM_SHARES"],
  description:
    "Redeems shares in a specified Polymarket market after it has resolved.",
  examples: [...redeemSharesExamples],
  validate: async (params: any) => {
    return params && params.marketId;
  },
  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[],
  ): Promise<string> => {
    const { marketId, userProvidedPrivateKey } = _options;

    if (!marketId) {
      return "Invalid input: Please provide marketId.";
    }

    const clobService = _runtime.getService(
      ClobService.serviceType,
    ) as ClobService;
    if (!clobService) {
      return "ClobService not available. Please check plugin configuration.";
    }

    const clobClient = clobService.getClobClient();

    // If not connected, try to connect
    /*if (!clobService.isWalletConnected()) {
      await clobService.connectWallet(userProvidedPrivateKey); // Get from user input
    }*/

    try {
      const result = await clobService.redeemShares(marketId);
      if (!result.success) {
        throw new Error(
          result.error || "Unknown error during simulated redemption",
        );
      }
      const responseText = `Successfully redeemed shares in market ${marketId}. Transaction details: ${JSON.stringify(
        result,
      )}`;

      //const responseText = `Simulated redemption of shares in market ${marketId}.  You need to implement the actual CLOB redemption logic here.`;
      await callback({ text: responseText });
      return responseText;
    } catch (e) {
      return `Error redeeming shares: ${e instanceof Error ? e.message : "Unknown error"}`;
    }
  },
};
