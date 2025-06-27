import { buySharesAction } from "./actions/trading/buyShares";
import { redeemSharesAction } from "./actions/trading/redeemShares";
import { redeemWinningsAction } from "./actions/trading/redeemWinnings";
import { sellSharesAction } from "./actions/trading/sellShares";
import { readMarketAction } from "./actions/utilities/readMarket";
import { readMarketsAction } from "./actions/utilities/readMarkets";
import { getUsernameAction, setUserAction } from "./actions/utilities/user";
import { connectWalletAction } from "./actions/wallet/connectWallet";
import { getWalletInfoAction } from "./actions/wallet/getWalletInfo";
import { ClobService } from "./services/clobService";
import GammaService from "./services/gammaService";
import { polymarketService } from "./services/polymarketService";
import { ResponseParserService } from "./services/responseParser";

const polymarketPlugin = {
    name: "polymarket",
    description: "Polymarket client",
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
    services: [polymarketService, ClobService, GammaService, ResponseParserService],
};
export default polymarketPlugin;