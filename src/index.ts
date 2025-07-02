import { type Plugin } from '@elizaos/core';
import { readMarkets } from "./actions/readMarkets";
import { buyOrder } from "./actions/buyOrder";
import { sellOrder } from "./actions/sellOrder";
import { redeemOrder } from "./actions/redeemOrder";
import { PolymarketService } from "./services/polymarketService";

const polymarketPlugin: Plugin = {
    name: "polymarket",
    description: "Polymarket integration for ElizaOS",
    services: [PolymarketService],
    actions: [readMarkets, buyOrder, sellOrder, redeemOrder],
    providers: [],
    init: async (config, runtime) => {
        // Perform any necessary initialization
        const apiKey = runtime.getSetting('EXAMPLE_API_KEY');
        if (!apiKey) {
        console.warn('EXAMPLE_API_KEY not provided');
        }
    },
};
export default polymarketPlugin;