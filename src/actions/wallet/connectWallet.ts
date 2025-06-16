import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type Content,
  logger,
  HandlerCallback,
} from "@elizaos/core";
import { ClobService } from "../../services/clobService"; // Import ClobService

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
    // This is a placeholder for the private key. In a real application, this
    // would be securely obtained from the user, e.g., through a wallet provider.
    //  NEVER hardcode a private key in your application.
    const privateKey = process.env.PK as string; //  For testing only!!!  Get from user input in real app

    if (!privateKey) {
      const errorMsg =
        "No private key provided.  Set PK env var (testing) or get from user.";
      logger.error(errorMsg);
      await callback({ text: errorMsg });
      return errorMsg;
    }

    const clobService = _runtime.getService(
      ClobService.serviceType,
    ) as ClobService;
    if (!clobService) {
      const errorMsg = "ClobService not available.";
      logger.error(errorMsg);
      await callback({ text: errorMsg });
      return errorMsg;
    }
    await clobService.connectWallet(privateKey);
    const successMsg = "Wallet connected successfully!";
    await callback({ text: successMsg });
    return successMsg;
  },
};
