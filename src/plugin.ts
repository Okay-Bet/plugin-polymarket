import { IAgentRuntime, logger, Route, type Plugin } from '@elizaos/core/v2';
import { ClobService } from './services/clobService';
import { readMarketsAction } from './actions/utilites/readMarkets';
import { readMarketAction } from './actions/utilites/readMarket';
import { buySharesAction } from './actions/trading/buyShares';
import { sellSharesAction } from './actions/trading/sellShares';
import { redeemWinningsAction } from './actions/trading/redeemWinnings';
import { redeemSharesAction } from './actions/trading/redeemShares';
import { getUsernameAction, setUserAction } from './actions/utilites/user';
import { connectWalletAction } from './actions/wallet/connectWallet';
import { getWalletInfoAction } from './actions/wallet/getWalletInfo';

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
    redeemWinningsAction
  ],
  services: [ClobService, ClobService],
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
          const markets = await ClobService.fetchMarkets();
          res.json(markets);
        } catch (error: any) {
          logger.error("Error fetching markets:", error);
          res.status(500).json({ error: error.message });
        }
      },
    },{
    path: "/welcome",
    type: "GET",
    handler:  async (req: any, res: any, runtime: IAgentRuntime) => {
        res.json({
          message: "Polymarket plugin has started and is operational.",
        });
      }
  } as Route],
  providers: []
};

export default pluginPolymarket;