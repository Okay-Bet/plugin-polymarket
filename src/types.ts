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