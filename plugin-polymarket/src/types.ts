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
    url?: string;
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
    // New properties from the updated API structure
    resolutionSource?: string;
    resolved?: boolean;
    archived?: boolean;
    category?: string;
    tags?: string[];
    conditions?: PolymarketCondition[];
}

export interface PolymarketOutcome {
    clobTokenId: string;
    name: string;
    price: number;
}

// Condition structure for transformed market data
export interface PolymarketCondition {
    id: string;
    humanReadableName: string;
    outcomes?: PolymarketConditionOutcome[];
}

// Outcome structure for conditions in transformed market data
export interface PolymarketConditionOutcome {
    name: string;
    address?: string;
    lastPrice?: number;
    priceChange24h?: number;
    yesPrice?: number;
    noPrice?: number;
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

export interface ReadMarketsActionParams {
    userLimit?: number; // The final number of markets to return after filtering
    activeOnly?: boolean;
    query?: string; // Text query for client-side filtering
}

export interface PolymarketApiCallParams {
    id?: string;            // Filter by market ID
    slug?: string;          // Filter by market slug
    clob_token_ids?: string; // Filter by clob token ID
    limit?: number;         // API limit for the number of results per page
    offset?: number;        // API offset for pagination
    active?: boolean;       // Filter by active status
    closed?: boolean;       // Filter by closed status
    archived?: boolean;     // Filter by archived status
    ascending?: boolean;    // Sort order
    liquidity_num_min?: string; // Minimum liquidity
    volume_num_min?: string;    // Minimum volume
    category?: string;      // Filter by category
    start_date_min?: string; // Filter markets starting after this date
    start_date_max?: string; // Filter markets starting before this date
    end_date_min?: string;  // e.g., YYYY-MM-DD, filter markets ending after this date
    end_date_max?: string;  // e.g., YYYY-MM-DD, filter markets ending before this date
}

export interface MarketCollectionOptions {
    query?: string;                     // Text for client-side filtering across all fetched results
    userLimit?: number;                 // Final limit on the number of markets returned after all fetching and filtering
    liquidityMin?: string;              // To be passed to API calls
    volumeMin?: string;                 // To be passed to API calls
    daysLookbackForEndDateMin?: number; // For calculating end_date_min
    daysLookbackForNewMarkets?: number; // For client-side filtering of new markets by start_date
    marketStatus?: 'active' | 'inactive' | 'all'; // Abstracted status for fetching
}

export interface PolymarketApiResponse {
    success: boolean;
    markets?: PolymarketMarket[];
    error?: string;
}

export interface GetMarketActionContent {
    text: string;
    marketId?: string; // Optional, can be extracted in handler
}

// For the service response when fetching a single market
export interface PolymarketSingleMarketApiResponse {
    success: boolean;
    market?: PolymarketMarket;
    error?: string;
}

// Type for raw API data from Polymarket API
export type PolymarketApiData = PolymarketRawMarket[] | PolymarketRawMarket;

// Raw market data structure from Polymarket API
export interface PolymarketRawMarket {
    /* ── core identifiers ─────────────────────────────────────────────── */
    id: string;
    slug: string;
    question: string;
  
    /* ── descriptive metadata ─────────────────────────────────────────── */
    description?: string;
    category?: string;
  
    /* ── lifecycle flags & dates (ISO‑8601) ───────────────────────────── */
    startDate?: string;
    endDate: string;
    active: boolean;
    closed?: boolean;
    resolved?: boolean;
    archived?: boolean;
    acceptingOrders?: boolean;
    new?: boolean;
  
    /* ── liquidity & volume ───────────────────────────────────────────── */
    liquidity?: number;
    volume?: number;
    volume24hr?: number;
    volume1wk?: number;
    volume1mo?: number;
    volume1yr?: number;
  
    /* ── price & order parameters ─────────────────────────────────────── */
    orderMinSize?: number;
    orderPriceMinTickSize?: number;
    oneDayPriceChange?: number;
    oneHourPriceChange?: number;
    oneWeekPriceChange?: number;
    oneMonthPriceChange?: number;
    lastTradePrice?: number;
    bestBid?: number;
    bestAsk?: number;

    /* ── outcomes & tokens ───────────────────────────────────────────── */
    outcomes?: string[] | Record<string, unknown>[] | string;
    outcomePrices?: string[] | string;
    clobTokenIds?: string[] | string;

  }
  

// Raw condition data structure from Polymarket API
export interface PolymarketRawCondition {
    id: string;
    human_readable_name: string;
    outcomes?: PolymarketRawOutcome[];
}

// Raw outcome data structure from Polymarket API
export interface PolymarketRawOutcome {
    name: string;
    address?: string;
    last_price?: number;
    price_change_24h?: number;
    yes_price?: number;
    no_price?: number;
}