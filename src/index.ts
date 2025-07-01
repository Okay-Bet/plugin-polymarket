import { readMarkets } from "./actions/readMarkets";
import { polymarketService } from "./services/polymarketService";

const polymarketPlugin = {
    name: "polymarket",
    description: "Polymarket client",
    actions: [readMarkets],
    services: [polymarketService],
};
export default polymarketPlugin;