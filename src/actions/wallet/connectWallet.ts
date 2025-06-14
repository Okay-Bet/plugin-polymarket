import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type Content,
  logger,
  HandlerCallback,
} from "@elizaos/core/v2";
import { PolymarketService } from "../../services/polymarketService"; // Import PolymarketService
import { connectWalletExamples } from "src/examples";

export const connectWalletAction: Action = {
  name: "CONNECT_WALLET",
  similes: ["LINK_WALLET", "AUTHORIZE_WALLET"],
  description: "Connects the user's cryptocurrency wallet to Polymarket.",
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Connect my wallet to Polymarket." },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Connecting your wallet... (In a real app, you'd see a wallet connection prompt)",
        },
      },
    ],
  ],

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
    const polymarketService = _runtime.getService(PolymarketService.serviceType) as
      | PolymarketService
      | undefined;
    if (!polymarketService) {
      const errorMsg = "PolymarketService not available.";
      logger.error(errorMsg);
      await callback({ text: errorMsg });
      return errorMsg;
    }

    try {
      // In a real implementation, this would trigger a wallet connection flow
      // (e.g., using a library like MetaMask's provider) and interact with the Polymarket API.
      const responseText =
        "Connecting your wallet... (In a real app, you'd see a wallet connection prompt and handle the connection)";
      await callback({ text: responseText });
      return responseText;
    } catch (error) {
      return `Error connecting wallet: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },
};
