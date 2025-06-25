import {
  type Action,
  type IAgentRuntime,
  Memory,
  type State,
  type Content,
  HandlerCallback,
} from "@elizaos/core/v2";
import { getWalletInfoExamples } from "../../examples";

// Placeholder for actual wallet information type
interface WalletInfo {
  chainId: string;
  address: string;
  balance: string;
  // Add other relevant wallet information here
}

export const getWalletInfoAction: Action = { 
  name: "GET_WALLET_INFO",
  similes: ["CHECK_WALLET_BALANCE", "VIEW_WALLET"],
  description:
    "Retrieves and displays information about the connected cryptocurrency wallet.",
  examples: [...getWalletInfoExamples],

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
  ): Promise<boolean> => {
    const context = (message.content as Content);
    const text = (context.text) ? context.text.toLowerCase() : "";
    return (
      text.includes("wallet") &&
      (text.includes("info") ||
        text.includes("balance") ||
        text.includes("show"))
    );
  },

  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State | undefined,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[]
  ): Promise<string> => {
    try {
      const clobService = _runtime.getService("ClobService") as any;
      if (!clobService) {
        return "Error: ClobService not available.";
      }

      // Ensure the wallet is connected
      const privateKey = process.env.PK;
      if (!privateKey) {
        return "Error: Private key not found in environment variables.";
      }

      await clobService.connectWallet(privateKey);

      const wallet = clobService.getClobClient().wallet;
      const address = await wallet.getAddress();
      const chainId = await wallet.getChainId();

      // Placeholder balance, needs actual implementation
      const walletInfo: WalletInfo = {
        chainId: chainId,
        address: address,
        balance: "0.00", // Replace with actual balance fetch logic
      };
      const responseText = `Your wallet is connected on chain ID: ${walletInfo.chainId}\nAddress: ${walletInfo.address}\nBalance: ${walletInfo.balance} (Placeholder - replace with actual balance)`;
      await callback({ text: responseText });
      return responseText;
    } catch (error) {
      return `Error getting wallet info: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },
};