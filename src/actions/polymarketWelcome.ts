import {
  Content,
  HandlerCallback,
  IAgentRuntime,
  logger,
  Memory,
  State,
  type Action,
} from "@elizaos/core/v2";
// Action to notify that the Polymarket plugin has started
export const polymarketPluginStartedAction: Action = {
  name: "POLYMARKET_PLUGIN_STARTED_NOTIFICATION",
  description:
    "Notifies that the Polymarket plugin has successfully started and is operational.",
  similes: ["PLUGIN_READY", "POLYMARKET_INITIALIZED", "POLYMARKET_ACTIVE"],
  examples: [
    [
      // This action is typically triggered internally upon plugin initialization.
      // A direct user invocation might not be standard.
      {
        name: "{{agent}}",
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
  ): Promise<string> => {
    const startupMessage = "Polymarket plugin has started and is operational.";
    logger.info(
      `Action [${polymarketPluginStartedAction.name}]: ${startupMessage}`,
    );
    const responseContent: Content = { text: startupMessage };
    await callback(responseContent);
    return startupMessage;
  },
};
export default polymarketPluginStartedAction;
