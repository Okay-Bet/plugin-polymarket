import {
	type IAgentRuntime,
	type Action,
	type Memory,
	type State,
	type HandlerCallback,
	logger,
} from "@elizaos/core/v2";
import { PolymarketService } from "../../services/polymarketService";

export const getApiKeyAction: Action = {
	name: "GET_API_KEY",
	similes: ["GET_API_KEY"],
	description: "Generates an API key for the Polymarket CLOB.",
	examples: [
		[
			{
				name: "{{user1}}",
				content: { text: "Generate a new API key for Polymarket." },
			},
			{
				name: "{{agent}}",
				content: { text: "Here is your new API key: ..." },
			},
		],
	],
	validate: async (params: any) => {
		return true;
	},
	handler: async (
		_runtime: IAgentRuntime,
		_message: Memory,
		_state: State,
		_options: any,
		callback: HandlerCallback,
		_responses: Memory[]
	): Promise<string> => {
		const polymarketService = _runtime.getService(
			PolymarketService.serviceType,
		) as PolymarketService;
		if (!polymarketService) {
			return "PolymarketService not available. Please check plugin configuration.";
		}

		try {
			const apiKey = await polymarketService.createApiKey();
			const message = `Your new API key is: ${JSON.stringify(apiKey)}`;
			await callback({ text: message });
			return message;
		} catch (error: any) {
			return `Error generating API key: ${error instanceof Error ? error.message : "Unknown error"}`;
		}
	},
} as Action;