import { IAgentRuntime, logger, Route, type Plugin, ModelType } from '@elizaos/core/v2';
import { PolymarketService } from './services/polymarketService';
import { readMarketsAction } from './actions/utilities/readMarkets';
import { readMarketAction } from './actions/utilities/readMarket';
import { buySharesAction } from './actions/trading/buyShares';
import { sellSharesAction } from './actions/trading/sellShares';
import { redeemWinningsAction } from './actions/trading/redeemWinnings';
import { redeemSharesAction } from './actions/trading/redeemShares';
import { getUsernameAction, setUserAction } from './actions/utilities/user';
import { connectWalletAction } from './actions/wallet/connectWallet';
import { getWalletInfoAction } from './actions/wallet/getWalletInfo';
import { getApiKeyAction } from './actions/wallet/getApiKey';

const pluginPolymarket: Plugin = {
	name: '@elizaos/plugin-polymarket',
	description: 'Plugin for Polymarket integration',
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
		redeemWinningsAction,
		getApiKeyAction
	],
	services: [PolymarketService],
	events: {
		VOICE_MESSAGE_RECEIVED: [
			async (params: any) =>
				logger.info("VOICE_MESSAGE_RECEIVED event received", params),
		],
		MESSAGE_RECEIVED: [
			async (params: any) =>
				logger.info("MESSAGE_RECEIVED event received", {
					message: params.message,
				}),
		],
	},
	routes: [
		{
			path: "/markets", // Example route, adjust as needed
			type: "GET",
			handler: async (req: any, res: any, runtime: IAgentRuntime) => {
				try {
					const markets = await PolymarketService.fetchMarkets();
					res.json(markets);
				} catch (error: any) {
					logger.error("Error fetching markets:", error);
					res.status(500).json({ error: error.message });
				}
			},
		}, {
			path: "/welcome",
			type: "GET",
			handler: async (req: any, res: any, runtime: IAgentRuntime) => {
				res.json({
					message: "Polymarket plugin has started and is operational.",
				});
			}
		} as Route],
	providers: [],
	models: {
		[ModelType.TEXT_SMALL]: async (runtime: IAgentRuntime, params: any) => {
			return "This is a response from a dummy TEXT_SMALL model.";
		},
		[ModelType.TEXT_LARGE]: async (runtime: IAgentRuntime, params: any) => {
			return "This is a response from a dummy TEXT_LARGE model.";
		}
	}
};

export default pluginPolymarket;