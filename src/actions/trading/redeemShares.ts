import {
	type IAgentRuntime,
	type Action,
	type Memory,
	type State,
	type HandlerCallback,
	logger,
} from "@elizaos/core/v2";
import { PolymarketService } from "../../services/polymarketService"; // Ensure correct path
import { redeemSharesExamples } from "src/examples";
import { RedeemParams } from "src/types";

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
		const { marketId } = _options;

		if (!marketId) {
			return "Invalid input: Please provide marketId.";
		}

		const polymarketService = _runtime.getService(
			PolymarketService.serviceType,
		) as PolymarketService;
		if (!polymarketService) {
			return "PolymarketService not available. Please check plugin configuration.";
		}


		try {
			const marketDataResponse = await PolymarketService.fetchMarketById(marketId);

			if (!marketDataResponse.success || !marketDataResponse.market) {
				return `Could not retrieve market data for market ID: ${marketId}. ${marketDataResponse.error}`;
			}

			const marketData = marketDataResponse.market;

			if (!marketData.resolved) {
				return `Market ${marketId} has not resolved yet. Cannot redeem shares.`
			}

			if (!marketData.conditions || marketData.conditions.length === 0) {
				return `Market ${marketId} has no conditions.`
			}

			const condition = marketData.conditions[0];

			const redeemParams: RedeemParams = {
				conditionalTokensAddress: "0x4e35122252a3bA8A5296A63aB4a31545539B334f", // This is a placeholder, you should have a way to get this value
				collateralTokenAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // This is a placeholder, you should have a way to get this value
				conditionId: condition.id,
				outcomeSlotCount: marketData.outcomes.length,
			};

			const result = await PolymarketService.redeemUserPositions(redeemParams);

			const message = result.message || "Redeem order processed.";
			await callback({ text: message });
			return message;
		} catch (e) {
			return `Error redeeming shares: ${e instanceof Error ? e.message : "Unknown error"}`;
		}
	},
} as Action;
