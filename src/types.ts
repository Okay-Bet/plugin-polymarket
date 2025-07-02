export interface PolymarketConfig {
    provider?: {
    apiUrl?: string;
    };
}

export interface PolymarketMarket {
    id: string;
    slug: string;
    question: string;
    description?: string;
    active: boolean;
    closed?: boolean;
    acceptingOrders?: boolean;
    new?: boolean;
    volume: number;
    liquidity: number;
    url: string;
    startDate?: string;
    endDate: string;
    outcomes: PolymarketOutcome[];
    orderMinSize?: string | number;
    orderPriceMinTickSize?: string | number;
    volume24hr?: number;
    volume1wk?: number;
    volume1mo?: number;
    volume1yr?: number;
    oneDayPriceChange?: number;
    oneHourPriceChange?: number;
    oneWeekPriceChange?: number;
    oneMonthPriceChange?: number;
    lastTradePrice?: number;
    bestBid?: number;
    bestAsk?: number;
}

export interface PolymarketOutcome {
    clobTokenId: string;
    name: string;
    price: number;
}

export interface ReadMarketsActionContent {
    text: string;
}

export interface ReadMarketsData {
    markets: PolymarketMarket[];
    query?: string;
    limit?: number;
    activeOnly?: boolean;
}

export interface FetchMarketsOptions {
    limit?: number;
    activeOnly?: boolean;
    query?: string;
}

export interface PolymarketApiResponse {
    success: boolean;
    markets?: PolymarketMarket[];
    error?: string;
}

// Buy Order Types and Interfaces

export enum OrderSide {
    BUY = "BUY",
    SELL = "SELL"
}

export enum OrderType {
    GTC = "GTC", // Good-Till-Cancelled
    GTD = "GTD", // Good-Til-Date
    FOK = "FOK"  // Fill-Or-Kill
}

export interface BuyOrderParams {
    tokenId: string;        // ERC1155 token ID for the outcome
    price: number;          // Price per token (0-1)
    size: number;           // Number of tokens to buy
    orderType?: OrderType;  // Order type (default GTC)
    expiration?: number;    // Unix timestamp (required for GTD)
}

export interface OrderValidationResult {
    valid: boolean;
    errors: string[];
    warnings?: string[];
}

export interface WalletConfig {
    privateKey?: string;
    address?: string;
    apiKey?: string;
    apiSecret?: string;
    apiPassphrase?: string;
}

export interface OrderResponse {
    success: boolean;
    orderId?: string;
    transactionHash?: string;
    error?: string;
    details?: {
        tokenId: string;
        price: number;
        size: number;
        side: OrderSide;
        orderType: OrderType;
        status: string;
    };
}

export interface BuyOrderActionContent {
    text: string;
}

export interface BuyOrderData {
    tokenId: string;
    price: number;
    size: number;
    orderType?: OrderType;
    expiration?: number;
}

// Sell Order Types and Interfaces

export interface SellOrderParams {
    tokenId: string;        // ERC1155 token ID for the outcome to sell
    price: number;          // Price per token (0-1)
    size: number;           // Number of tokens to sell
    orderType?: OrderType;  // Order type (default GTC)
    expiration?: number;    // Unix timestamp (required for GTD)
}

export interface SellOrderActionContent {
    text: string;
}

export interface SellOrderData {
    tokenId: string;
    price: number;
    size: number;
    orderType?: OrderType;
    expiration?: number;
}

// Redeem Order Types and Interfaces

export interface RedeemablePosition {
    tokenId: string;           // ERC1155 token ID for the winning outcome
    marketId: string;          // Market ID
    marketQuestion: string;    // Market question for user reference
    amount: number;           // Number of tokens held
    winningOutcome: string;   // Name of the winning outcome
    estimatedPayout: number;  // Expected USDC payout (amount * 1.0)
    marketResolved: boolean;  // Whether market is officially resolved
    payoutsReported: boolean; // Whether payouts have been reported to CTF contract
}

export interface RedeemParams {
    positions: RedeemablePosition[]; // Array of positions to redeem
    batchRedeem?: boolean;          // Whether to batch multiple redemptions
}

export interface RedeemValidationResult {
    valid: boolean;
    errors: string[];
    warnings?: string[];
    totalPayout?: number;           // Total expected USDC payout
    gasEstimate?: string;           // Estimated gas cost
}

export interface RedeemResponse {
    success: boolean;
    transactionHash?: string;
    error?: string;
    details?: {
        redeemedPositions: {
            tokenId: string;
            amount: number;
            payout: number;
        }[];
        totalPayout: number;        // Total USDC received
        gasUsed?: string;
        status: string;
    };
}

export interface RedeemOrderActionContent {
    text: string;
}

export interface RedeemOrderData {
    positions: RedeemablePosition[];
    batchRedeem?: boolean;
}

export interface CTFContractInfo {
    address: string;                // CTF contract address
    collateralToken: string;        // USDC contract address
    chainId: number;               // Polygon network chain ID (137)
}