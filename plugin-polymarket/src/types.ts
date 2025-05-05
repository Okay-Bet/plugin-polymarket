export interface PolymarketConfig {
    provider?: {
    apiUrl?: string;
    };
}

export interface PolymarketMarket {
    id: string;
    question: string;
    description?: string;
    volume: number;
    liquidity: number;
    url: string;
    endDate: string;
    outcomes: PolymarketOutcome[];
    isActive: boolean;
}

export interface PolymarketOutcome {
    id: string;
    name: string;
    probability: number;
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