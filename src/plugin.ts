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
import { ResponseParserService } from "./services/responseParser";
import { buySharesAction } from "./actions/trading/buyShares";
import { sellSharesAction } from "./actions/trading/sellShares";
import { redeemSharesAction } from "./actions/trading/redeemShares";
import { GammaService } from "./services/gammaService";
import { readMarketAction } from "./actions/utilites/readMarket";
import { readMarketsAction } from "./actions/utilites/readMarkets";
import { setUserAction, getUsernameAction } from "./actions/utilites/user"; // Import user actions

import {
  buySharesModel,
  sellSharesModel,
  readMarketModel,
  readMarketsModel,
  redeemSharesModel,
} from "./models";

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
  config: {},
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
    setUserAction,
    getUsernameAction,
  ],
  services: [PolymarketService],
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
      path: "/welcome",
      type: "GET",
      handler: async (req, res) =>
        res.json({
          message: "Polymarket plugin has started and is operational.",
        }),
    },
  ] as Route[],
  models: {
    [ModelType.TEXT_SMALL]: async (runtime, params) => "Simple mock response",
    [ModelType.TEXT_LARGE]: async (runtime, params) =>
      (
        await runtime.useModel(ModelType.TEXT_LARGE, {
          prompt: `Mock TEXT_LARGE response to: ${params.prompt.substring(
            0,
            50,
          )}`,
        })
      ).text,
  },
  providers: [
    {
      name: "POLYMARKET_PROVIDER",
      description: "A simple hello world provider.",
      get: async (runtime, message, state) => ({
        text: "I am a provider",
        values: {},
        data: {},
      }),
    },
  ],
  services: [ResponseParserService],
};

// Import the models at the top of the file

// Update action handlers to use models
readMarketsAction.handler = async (
  runtime: IAgentRuntime,
  message: Memory,
  state: State,
  _options: any,
  callback: HandlerCallback,
  _responses: Memory[],
) => {
  try {
    const content = message.content as Content;
    const text = content.text;

    const modelResult = await runtime.useModel(ModelType.OBJECT_SMALL, {
      prompt: readMarketsModel,
      text,
    });

    // Use the extracted data from the model to build the response.
    // This will replace the existing logic for extracting query/limit.
    return readMarketsAction.originalHandler(
      runtime,
      message,
      state,
      {
        query: modelResult.query,
        limit: modelResult.limit || 10, // Default limit if not specified.
      },
      callback,
      _responses,
    );
  } catch (error) {
    logger.error(error);
    return `Sorry, there was an error fetching prediction markets: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
  }
};

// Store the original handler before overwriting it
readMarketsAction.originalHandler = readMarketsAction.handler;
(readMarketsAction as any).formatMarketsResponse = (markets, query) => {
// Now we can replace the handler with the new logic that uses the model
(readMarketsAction as any).handler = async (runtime: IAgentRuntime, message: Memory, state?: State, options: { query?: string, limit?: number } = {}, callback: HandlerCallback, responses: Memory[]) => {
  // Use options passed from the model or defaults.
  const { query, limit } = options;
  logger.info(`[readMarketsAction.handler] Query: ${query}, Limit: ${limit}`); // Added logging


  try {
    const result = await GammaService.fetchMarkets();

    if (!result.success || !result.markets || result.markets.length === 0) {
      return `Sorry, I couldn't find any prediction markets${
        query ? ` about "${query}"` : ""
      }.${result.error ? ` ${result.error}` : ""}`;
    }

    let filteredMarkets = result.markets;
    if (query && query.trim() !== "") {
      const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const wordPattern = new RegExp(`\\b${escaped}\\b`, "i");

      filteredMarkets = result.markets.filter(
        (m) =>
          (m.question && wordPattern.test(m.question)) ||
          (m.description && wordPattern.test(m.description)) ||
          (m.slug && wordPattern.test(m.slug.replace(/-/g, " "))),
      );
    }

    const response = readMarketsAction.formatMarketsResponse(
      filteredMarkets.slice(0, limit),
      query,
    );
    const responseContent: Content = {
      text: response,
    };

    await callback(responseContent);
    return responseContent;
  } catch (error) {
    logger.error(error);
    return `Sorry, there was an error fetching prediction markets: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
  }
};}

// Helper function to format markets response
readMarketsAction.formatMarketsResponse = (markets, query) => {
  if (markets.length === 0) {
    return `I couldn't find any prediction markets${
      query ? ` about "${query}"` : ""
    }.`;
  }

  const marketCount = markets.length;
  const queryText = query ? ` about "${query}"` : "";

  let response = `Here ${marketCount === 1 ? "is" : "are"} the top ${marketCount} prediction market${marketCount === 1 ? "" : "s"}${queryText} on Polymarket:\n`;

  markets.forEach((market, index) => {
    response += `${index + 1}. "${market.question}" - `;

    if (market.outcomes && market.outcomes.length > 0) {
      response += market.outcomes
        .map((outcome) => `${outcome.name}: $${outcome.price}`)
        .join(", ");
    } else {
      response += "No outcome data available";
    }

    if (index < markets.length - 1) {
      response += "\n";
    }
  });
  return response;
};

export const init = async (runtime: IAgentRuntime) => {
  await pluginPolymarket.init?.({}, runtime);
};
export default pluginPolymarket;
