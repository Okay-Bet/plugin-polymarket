import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type Content,
  logger,
  HandlerCallback,
} from "@elizaos/core/v2";
import { ClobService } from "../../services/clobService"; // Import ClobService
import { connectWalletExamples } from "src/examples";

export const connectWalletAction: Action = {
  name: "CONNECT_WALLET",
  similes: ["LINK_WALLET", "AUTHORIZE_WALLET"],
  description: "Connects the user's cryptocurrency wallet to Polymarket.",
  examples: [...connectWalletExamples],

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
  ): Promise<boolean> => {
    const text = (message.content as Content).text.toLowerCase();
    return (
      text.includes("connect") &&
      text.includes("wallet") &&
      text.includes("polymarket")
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
    // In a real application, you'd trigger a wallet connection flow here.
    // This involves interacting with a wallet provider (e.g., MetaMask)
    // in the UI, not directly within the action handler.
    // For now, we'll just emit an event to signal that the UI should connect.
    const clobService = _runtime.getService(ClobService.serviceType) as ClobService;
    if (!clobService) {
      const errorMsg = "ClobService not available.";
      logger.error(errorMsg);
      await callback({ text: errorMsg });
      return errorMsg;
    }

    // Emit an event to notify the UI that a wallet connection is needed.
    const eventPayload = { type: "REQUEST_WALLET_CONNECT" };
    await callback({
      text: "Please connect your wallet.",
      // You might need a way to pass the event payload to the UI.  This depends on how your UI is structured.
      // For instance, you could add the payload to the content metadata, or have a separate event system.
      metadata: { walletEvent: eventPayload },
    });
    return "Requesting wallet connection...";
  },
};
