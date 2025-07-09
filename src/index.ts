import { type Plugin } from '@elizaos/core';
import { readMarkets } from "./actions/readMarkets.js";
import { buyOrder } from "./actions/buyOrder.js";
import { sellOrder } from "./actions/sellOrder.js";
import { redeemOrder } from "./actions/redeemOrder.js";
import { PolymarketService } from "./services/polymarketService.js";

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
export { PolymarketService };