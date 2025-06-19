import {
  type Plugin,
  logger,
  ModelType,
} from "@elizaos/core/v2";
import { ResponseParserService } from "./services/responseParser";
import { buySharesAction } from "./actions/trading/buyShares";
import { sellSharesAction } from "./actions/trading/sellShares";
import { redeemSharesAction } from "./actions/trading/redeemShares";
import { readMarketAction } from "./actions/utilites/readMarket";
import { readMarketsAction } from "./actions/utilites/readMarkets";
import { setUserAction, getUsernameAction } from "./actions/utilites/user"; // Import user actions
import { connectWalletAction } from "./actions/wallet/connectWallet";
import { ClobService } from "./services/clobService";
import { GammaService } from "./services/gammaService";

const pluginPolymarket: Plugin = {
  name: "@elizaos/plugin-polymarket",
  description: "Plugin for Polymarket integration",
  config: {},
  actions: [
    connectWalletAction,
    getUsernameAction,
    setUserAction,
    readMarketsAction,
    readMarketAction,
    buySharesAction,
    sellSharesAction,
    redeemSharesAction,
  ],
  services: [ResponseParserService, ClobService, GammaService],
  events: {
    VOICE_MESSAGE_RECEIVED: [
      async (params: any) =>
        logger.info("VOICE_MESSAGE_RECEIVED event received", params),
    ],
    MESSAGE_RECEIVED: [
      async (params: any) =>
        logger.info("MESSAGE_RECEIVED event received", params),
    ],
  },
  routes: [
    {
      path: "/markets", // Example route, adjust as needed
      type: "GET",
      handler: async (req: any, res: any, runtime) => {
        try {
          const markets = await GammaService.fetchMarkets();
          res.json(markets);
        } catch (error: any) {
          logger.error("Error fetching markets:", error);
          res.status(500).json({ error: error.message });
        }
      },
    },
    {
      path: "/welcome",
      type: "GET",
      handler: async (req: any, res: any, runtime) => {
        res.json({
          message: "Polymarket plugin has started and is operational.",
        });
      },
    },
  ],
  models: {
    [ModelType.TEXT_SMALL]: async (AgentRuntime, params) => {
      // You should structure the response to include the action you want to trigger.
      const response = {
        text: `Mock TEXT_SMALL response to: ${params.prompt.substring(0, 50)}`,
        thought: "This is my mock thought for a small model.",
        actions: [], // Specify the action bassed on action examples
      };

      return response.text; // Return only the text part for now, as per your original structure
    },
    [ModelType.TEXT_LARGE]: async (AgentRuntime, params) => {
      // You should structure the response to include the action you want to trigger.
      const response = {
        text: `Mock TEXT_LARGE response to: ${params.prompt.substring(0, 5000)}`,
        thought: "This is my mock thought for a large model.",
        actions: [], // Specify the action bassed on action examples
      };

      return response.text; // Return only the text part for now, as per your original structure
    },
    [ModelType.TEXT_EMBEDDING]: async (AgentRuntime, params) => {
      // You should structure the response to include the action you want to trigger.
      const response = {
        text: `Mock TEXT_EMBEDDING response to: `,
        thought: "This is my mock thought for a text embedding model.",
        actions: [], // Specify the action bassed on action examples
      };

      return response.text; // Return only the text part for now, as per your original structure
    },
  },
  providers: [],

  async init(config, runtime) {
    runtime.registerPlugin(pluginPolymarket);
  },
};

export const init = async (runtime) => {
  await pluginPolymarket.init;
};
export { pluginPolymarket };
export default pluginPolymarket;
