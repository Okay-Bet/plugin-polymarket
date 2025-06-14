import {
  type Plugin,
  type Route,
  logger,
  ModelType,
  type IAgentRuntime,
  type Action,
  type Memory,
  type State,
  type Content,
  type HandlerCallback,
} from "@elizaos/core";
import { buySharesAction } from "./actions/trading/buyShares";
import { sellSharesAction } from "./actions/trading/sellShares";
import { redeemSharesAction } from "./actions/trading/redeemShares";
import { GammaService } from "./services/gammaService";
import { readMarketAction } from "./actions/utilites/readMarket";
import { readMarketsAction } from "./actions/utilites/readMarkets";
import { setUserAction, getUsernameAction } from "./actions/utilites/user"; // Import user actions

// Action to notify that the Polymarket plugin has started
const polymarketPluginStartedAction: Action = {
  name: "POLYMARKET_PLUGIN_STARTED_NOTIFICATION",
  description:
    "Notifies that the Polymarket plugin has successfully started and is operational.",
  similes: ["PLUGIN_READY", "POLYMARKET_INITIALIZED", "POLYMARKET_ACTIVE"],
  examples: [
    [
      // This action is typically triggered internally upon plugin initialization.
      // A direct user invocation might not be standard.
      {
        name: "agent",
        content: { text: "Polymarket plugin is now active and ready." },
      },
    ],
  ],
  validate: async () => true, // Always valid as it's a system notification or status indication.
  handler: async (
    runtime: IAgentRuntime,
    message: Memory, // Unused in this action, but required by the handler interface
    _state: State, // Unused
    _options: any, // Unused
    callback: HandlerCallback,
  ): Promise<string | Content> => {
    const startupMessage = "Polymarket plugin has started and is operational.";
    logger.info(
      `Action [${polymarketPluginStartedAction.name}]: ${startupMessage}`,
    );
    const responseContent: Content = { text: startupMessage };
    await callback(responseContent);
    return startupMessage;
  },
};
// Minimal StarterService definition for tests to import
export class StarterService {
  static serviceType = "starter";
  runtime: IAgentRuntime;
  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
  }
  static async start(runtime: IAgentRuntime) {
    const serviceInstance = new StarterService(runtime);
    return serviceInstance;
  }
  async stop() {
    logger.info("StarterService stopped");
  }
  get capabilityDescription() {
    return "This is a starter service which is attached to the agent through the starter plugin.";
  }
  static async stop(runtime: IAgentRuntime) {
    const service = runtime.getService(StarterService.serviceType);
    if (!service)
      throw new Error("Starter service not found in runtime for stop"); // Adjusted error message
    await service.stop();
  }
}

const pluginPolymarket: Plugin = {
  name: "plugin-polymarket",
  description: "Plugin for Polymarket integration",
  actions: [
    connectWalletAction,
    getUsernameAction,
    setUserAction,
    getWalletInfoAction,
    readMarketsAction,
    readMarketAction,
    buySharesAction,
    sellSharesAction,
    redeemSharesAction,
    polymarketPluginStartedAction,
    readMarketAction,
    setUserAction, // Add setUserAction
    getUsernameAction, // Add getUsernameAction
  ],
  services: [PolymarketService],
  events: {
    VOICE_MESSAGE_RECEIVED: [
      async (params: any) => {
        logger.info("VOICE_MESSAGE_RECEIVED event received", params);
      },
    ], // Existing event handler
    MESSAGE_RECEIVED: [
      async (params: any) => {
        // Existing event handler
        logger.info("MESSAGE_RECEIVED event received", params);
      },
    ],
  },
  routes: [
    {
      path: "/welcome",
      type: "GET",
      handler: async (req, res) => {
        res.json({
          message: "Polymarket plugin has started and is operational.",
        });
      },
    },
  ] as Route[],
  config: {},
  models: {
    [ModelType.TEXT_SMALL]: async (runtime, params) =>
      ({
        text: `Mock TEXT_SMALL response to: ${params.prompt.substring(0, 50)}`, // Keep the structure for now
        thought: "This is my mock thought for a small model.",
        actions: [], // Empty actions array for now
      }).text, // Return only the text property
    [ModelType.TEXT_LARGE]: async (runtime, params) =>
      ({
        text: `Mock TEXT_LARGE response to: ${params.prompt.substring(0, 50)}`, // Keep the structure for now
        thought: "This is my mock thought for a large model.",
        actions: [], // Empty actions array for now
      }).text, // Return only the text property
  },
  providers: [
    {
      name: "POLYMARKET_PROVIDER",
      description: "A simple hello world provider.",
      get: async (runtime, message, state) => {
        // Unused parameters, but required by the provider interface
        return {
          text: "I am a provider",
          values: {},
          data: {},
        };
      },
    },
  ],
  // services: [StarterService] // Uncomment if your plugin should actually register this service
};

export const init = async (runtime: IAgentRuntime) => {
  await pluginPolymarket.init?.({}, runtime);
};
export default pluginPolymarket;
