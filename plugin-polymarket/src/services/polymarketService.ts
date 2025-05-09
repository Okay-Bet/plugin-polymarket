import {
  PolymarketMarket,
  PolymarketApiResponse,
  PolymarketApiData,
  PolymarketRawMarket,
  ReadMarketsActionParams,
  PolymarketApiCallParams,
  MarketCollectionOptions,
  PolymarketSingleMarketApiResponse
} from "../types";
import { elizaLogger } from "@elizaos/core";


// === CONFIGURATION ===
let polymarketApiUrl = "https://gamma-api.polymarket.com/markets";
const DEFAULT_LIQUIDITY_MIN = "1000";
const DEFAULT_VOLUME_MIN = "1000";

export function initializePolymarketConfig(config: { apiUrl?: string }) {
  if (config.apiUrl) {
      polymarketApiUrl = config.apiUrl;
      elizaLogger.info(`Polymarket API URL initialized to: ${polymarketApiUrl}`);
  }
}

// === HELPER FUNCTIONS ===
function _buildApiUrl(params: PolymarketApiCallParams): string {
  const query = new URLSearchParams();
  
  query.append('limit', params.limit?.toString() ?? '100');
  query.append('offset', params.offset?.toString() ?? '0');

  if (params.id) query.append('id', params.id);
  if (params.slug) query.append('slug', params.slug);
  if (params.clob_token_ids) query.append('clob_token_ids', params.clob_token_ids);
  if (params.active !== undefined) query.append('active', params.active.toString());
  if (params.closed !== undefined) query.append('closed', params.closed.toString());
  if (params.archived !== undefined) query.append('archived', params.archived.toString());
  if (params.end_date_min) query.append('end_date_min', params.end_date_min);
  if (params.end_date_max) query.append('end_date_max', params.end_date_max);
  if (params.start_date_min) query.append('start_date_min', params.start_date_min);
  if (params.start_date_max) query.append('start_date_max', params.start_date_max);
  if (params.volume_num_min) query.append('volume_num_min', params.volume_num_min);
  if (params.liquidity_num_min) query.append('liquidity_num_min', params.liquidity_num_min);

  return `${polymarketApiUrl}?${query.toString()}`;
}

// Transforms raw market data into the PolymarketMarket structure
function _transformMarketData(rawMarket: PolymarketRawMarket): PolymarketMarket {
  let processedOutcomes: { name: string; price: number; clobTokenId: string }[] = [];
  try {
    const outcomeNames = typeof rawMarket.outcomes === 'string' ? JSON.parse(rawMarket.outcomes) : rawMarket.outcomes;
    const outcomePricesStr = typeof rawMarket.outcomePrices === 'string' ? JSON.parse(rawMarket.outcomePrices) : rawMarket.outcomePrices;
    const clobTokenIds = typeof rawMarket.clobTokenIds === 'string' ? JSON.parse(rawMarket.clobTokenIds) : rawMarket.clobTokenIds;

    if (Array.isArray(outcomeNames) && Array.isArray(outcomePricesStr) && Array.isArray(clobTokenIds) && outcomeNames.length === outcomePricesStr.length && outcomeNames.length === clobTokenIds.length) {
      processedOutcomes = outcomeNames.map((name: string, index: number) => ({
        clobTokenId: clobTokenIds[index],
        name: name,
        price: parseFloat(outcomePricesStr[index]) || 0,
      }));
    } else if (rawMarket.outcomes || rawMarket.outcomePrices) { // Log only if there was an attempt to parse
      console.warn(`rawMarket ID ${rawMarket.id}: Mismatch or invalid format in outcomes/outcomePrices. Received outcomes: ${rawMarket.outcomes}, Received prices: ${rawMarket.outcomePrices}`);
    }
  } catch (e) {
    console.error(`rawMarket ID ${rawMarket.id}: Error parsing outcomes/prices JSON strings. Received outcomes: ${rawMarket.outcomes}, Received prices: ${rawMarket.outcomePrices}`, e);
  }
  return {
    id: rawMarket.id,
    slug: rawMarket.slug,
    question: rawMarket.question,
    description: rawMarket.description || "",
    active: rawMarket.active,
    closed: rawMarket.closed,
    acceptingOrders: rawMarket.acceptingOrders,
    new: rawMarket.new,
    volume: rawMarket.volume || 0,
    liquidity: rawMarket.liquidity || 0,
    url: `https://polymarket.com/rawMarket/${rawMarket.slug}`,
    startDate: rawMarket.startDate,
    endDate: rawMarket.endDate,
    orderMinSize: rawMarket.orderMinSize,
    orderPriceMinTickSize: rawMarket.orderPriceMinTickSize,
    volume24hr: rawMarket.volume24hr,
    volume1wk: rawMarket.volume1wk,
    volume1mo: rawMarket.volume1mo,
    volume1yr: rawMarket.volume1yr,
    oneDayPriceChange: rawMarket.oneDayPriceChange,
    oneHourPriceChange: rawMarket.oneHourPriceChange,
    oneWeekPriceChange: rawMarket.oneWeekPriceChange,
    oneMonthPriceChange: rawMarket.oneMonthPriceChange,
    lastTradePrice: rawMarket.lastTradePrice,
    bestBid: rawMarket.bestBid,
    bestAsk: rawMarket.bestAsk,
    outcomes: processedOutcomes,
  };
}

// Fetches a single page of markets based on provided API parameters
async function fetchMarketPage(apiParams: PolymarketApiCallParams): Promise<PolymarketApiResponse> {
  try {
      const url = _buildApiUrl(apiParams);
      const response = await fetch(url);

      if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
      }

      const data: PolymarketApiData = await response.json();
      if (!Array.isArray(data)) {
          console.warn("API returned non-array data for a market page request:", data);
           // If API returns a single object for a market ID lookup, treat it as a single market result
          if (data && typeof data === 'object' && (data as PolymarketRawMarket).id && (apiParams.slug || apiParams.id)) {
               return { success: true, markets: [_transformMarketData(data as PolymarketRawMarket)] };
          }
          return { success: true, markets: [] }; // Default for list endpoints
      }

      const markets: PolymarketMarket[] = data.map(_transformMarketData);
      return { success: true, markets };

  } catch (error) {
      console.error("Error in fetchMarketPage:", error);
      return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error occurred in fetchMarketPage",
          markets: []
      };
  }
}

// Helper to fetch all markets by handling pagination
async function _fetchAllMarketsPaginated(baseParams: Omit<PolymarketApiCallParams, 'limit' | 'offset'>): Promise<PolymarketApiResponse> {
  const allMarkets: PolymarketMarket[] = [];
  let offset = 0;
  const limit = 100; // Polymarket's typical max limit per page
  let hasMore = true;
  let totalFetchedInSession = 0; // Safety break for runaway pagination
  const MAX_TOTAL_FETCH = 5000; // Max 50 pages if limit is 100

  while (hasMore && totalFetchedInSession < MAX_TOTAL_FETCH) {
      const pageParams: PolymarketApiCallParams = {
          ...baseParams,
          limit,
          offset,
      };
      const pageResponse = await fetchMarketPage(pageParams);

      if (!pageResponse.success || !pageResponse.markets) {
          // If a page fails, return what we have so far with the error
          return { success: false, error: pageResponse.error || "Pagination failed", markets: allMarkets };
      }

      if (pageResponse.markets.length > 0) {
          allMarkets.push(...pageResponse.markets);
          offset += pageResponse.markets.length;
          totalFetchedInSession += pageResponse.markets.length;
      }
      
      // Polymarket API might not explicitly say "no more pages".
      // We assume if fewer than `limit` markets are returned, it's the last page.
      if (pageResponse.markets.length < limit) {
          hasMore = false;
      }
  }
  if (totalFetchedInSession >= MAX_TOTAL_FETCH) {
      elizaLogger.warn(`_fetchAllMarketsPaginated: Reached MAX_TOTAL_FETCH (${MAX_TOTAL_FETCH}) for params:`, baseParams);
  }

  return { success: true, markets: allMarkets };
}


// === SERVICE OBJECT ===
export const polymarketService = {
/**
 * Fetches markets based on user-friendly parameters.
 * This function is used by the `readMarkets` action.
 * It now uses the more robust [getCurrentMarketsAll](cci:1://file:///Users/d/Desktop/plugin-polymarket/plugin-polymarket/src/services/polymarketService.ts:271:2-306:3) or `getAllMarketsEver` internally.
 */
fetchMarkets: async (options: ReadMarketsActionParams = {}): Promise<PolymarketApiResponse> => {
  const { userLimit, activeOnly = true, query = "" } = options;

  const collectionOptions: MarketCollectionOptions = {
      userLimit,
      query,
      // Pass through defaults or let the specialized functions handle their own
      liquidityMin: DEFAULT_LIQUIDITY_MIN, 
      volumeMin: DEFAULT_VOLUME_MIN,
      // getCurrentMarketsAll defaults daysLookbackForEndDateMin to 3 if not specified
  };

  if (activeOnly) {
      return polymarketService.getCurrentMarketsAll(collectionOptions);
  } else {
      // If activeOnly is false, we want both active and inactive markets.
      // getAllMarketsEver is designed for this.
      return polymarketService.getAllMarketsEver(collectionOptions);
  }
},

fetchMarketById: async (marketId: string): Promise<PolymarketSingleMarketApiResponse> => {
  if (!marketId || typeof marketId !== 'string' || marketId.trim() === '') {
    return { success: false, error: "Market ID must be a non-empty string." };
  }
  try {
    const response = await fetch(`${polymarketApiUrl}/${marketId.trim()}`);
    if (!response.ok) {
      if (response.status === 404) return { success: false, error: `Market with ID "${marketId}" not found.` };
      throw new Error(`API request failed with status ${response.status}`);
    }
    const rawMarketData = await response.json();
    if (!rawMarketData || typeof rawMarketData !== 'object' || !rawMarketData.id) {
      return { success: false, error: `Market with ID "${marketId}" not found or invalid response format.` };
    }
    const market = _transformMarketData(rawMarketData);
    return { success: true, market: market };
  } catch (error) {
    console.error(`Error fetching market by ID "${marketId}":`, error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error occurred." };
  }
},

// Exposing the raw page fetcher for advanced use if needed
fetchMarketPage: fetchMarketPage,

// Get all "current" (active, optionally within date/liquidity/volume constraints) markets
getCurrentMarketsAll: async (options: MarketCollectionOptions = {}): Promise<PolymarketApiResponse> => {
  const baseParams: Omit<PolymarketApiCallParams, 'limit' | 'offset'> = {
      active: true,
      ascending: false, // Most relevant/newest first
      liquidity_num_min: options.liquidityMin,
      volume_num_min: options.volumeMin,
  };

  const daysLookback = options.daysLookbackForEndDateMin === undefined ? 3 : options.daysLookbackForEndDateMin;
  if (daysLookback >= 0) { // Allow 0 for "ending today or later"
      const date = new Date();
      date.setDate(date.getDate() - daysLookback);
      baseParams.end_date_min = date.toISOString().split('T')[0];
  }
  
  const { markets, error } = await _fetchAllMarketsPaginated(baseParams);

  if (error) { return { success: false, error, markets: [] }; }

  let filteredMarkets = markets;
  if (options.query && options.query.trim() !== "") {
      const lowerCaseQuery = options.query.toLowerCase().trim();
      filteredMarkets = markets.filter(m =>
        (m.question && m.question.toLowerCase().includes(lowerCaseQuery)) ||
        (m.description && m.description.toLowerCase().includes(lowerCaseQuery)) ||
        (m.slug && m.slug.toLowerCase().replace(/-/g, ' ').includes(lowerCaseQuery))
      );
  }
  
  const finalMarkets = options.userLimit !== undefined ? filteredMarkets.slice(0, options.userLimit) : filteredMarkets;
  return { success: true, markets: finalMarkets };
},

// Get "new" markets (created recently, active)
getNewMarketsAll: async (options: MarketCollectionOptions = {}): Promise<PolymarketApiResponse> => {
  const daysLookbackNew = options.daysLookbackForNewMarkets === undefined ? 3 : options.daysLookbackForNewMarkets;

  const baseParams: Omit<PolymarketApiCallParams, 'limit' | 'offset'> = {
      active: true,
      ascending: false, 
      liquidity_num_min: options.liquidityMin,
      volume_num_min: options.volumeMin,
      // For "new", we primarily filter by startDate client-side after fetching active markets.
      // We can also set a start_date_min if API supports it well for "newness".
      // Let's try setting start_date_min directly.
  };
   if (daysLookbackNew >= 0) {
      const lookbackDate = new Date();
      lookbackDate.setDate(lookbackDate.getDate() - daysLookbackNew);
      lookbackDate.setHours(0,0,0,0);
      baseParams.start_date_min = lookbackDate.toISOString().split('T')[0];
  }


  const { markets, error } = await _fetchAllMarketsPaginated(baseParams);

  if (error) { return { success: false, error, markets: [] }; }
  
  // Additional client-side filtering if API's start_date_min is not precise enough or not used
  // let filteredByDate = markets;
  // if (daysLookbackNew >= 0 && !baseParams.start_date_min) { // Apply client-side if not done by API
  //     const lookbackDate = new Date();
  //     lookbackDate.setDate(lookbackDate.getDate() - daysLookbackNew);
  //     lookbackDate.setHours(0, 0, 0, 0); 

  //     filteredByDate = markets.filter(m => {
  //         if (!m.startDate) return false;
  //         try {
  //             const marketStartDate = new Date(m.startDate);
  //             return marketStartDate >= lookbackDate;
  //         } catch (e) {
  //             console.warn(`Invalid startDate for market ${m.id}: ${m.startDate}`);
  //             return false;
  //         }
  //     });
  // }
  
  let furtherFiltered = markets; // Start with markets if start_date_min was effective
  if (options.query && options.query.trim() !== "") {
      const lowerCaseQuery = options.query.toLowerCase().trim();
      furtherFiltered = markets.filter(m =>
        (m.question && m.question.toLowerCase().includes(lowerCaseQuery)) ||
        (m.description && m.description.toLowerCase().includes(lowerCaseQuery)) ||
        (m.slug && m.slug.toLowerCase().replace(/-/g, ' ').includes(lowerCaseQuery))
      );
  }
  
  const finalMarkets = options.userLimit !== undefined ? furtherFiltered.slice(0, options.userLimit) : furtherFiltered;
  return { success: true, markets: finalMarkets };
},

// Get ALL markets (active and inactive)
getAllMarketsEver: async (options: MarketCollectionOptions = {}): Promise<PolymarketApiResponse> => {
  const allFetchedMarkets: PolymarketMarket[] = [];
  let combinedError: string | undefined;

  const commonParams = {
      liquidity_num_min: options.liquidityMin,
      volume_num_min: options.volumeMin,
  };

  // Fetch active markets
  const activeResult = await _fetchAllMarketsPaginated({ ...commonParams, active: true, ascending: false });
  if (activeResult.markets) allFetchedMarkets.push(...activeResult.markets);
  if (activeResult.error) combinedError = `Error active: ${activeResult.error}`;

  // Fetch inactive markets
  const inactiveResult = await _fetchAllMarketsPaginated({ ...commonParams, active: false, ascending: false });
  if (inactiveResult.markets) {
      allFetchedMarkets.push(...inactiveResult.markets);
  }
  if (inactiveResult.error) {
      combinedError = combinedError
          ? `${combinedError}. Error fetching inactive markets: ${inactiveResult.error}`
          : `Error fetching inactive markets: ${inactiveResult.error}`;
  }

  const uniqueMarketIds = new Set<string>();
  const uniqueMarkets = allFetchedMarkets.filter(market => {
      if (uniqueMarketIds.has(market.id)) {
          return false;
      }
      uniqueMarketIds.add(market.id);
      return true;
  });

  // Sort all combined markets by start date (descending for newest first) if not sorted by API consistently
  uniqueMarkets.sort((a, b) => {
      try {
          const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
          const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
          return dateB - dateA; // Newest first
      } catch { return 0; }
  });

  let filteredMarkets = uniqueMarkets;
  if (options.query && options.query.trim() !== "") {
      const lowerCaseQuery = options.query.toLowerCase().trim();
      filteredMarkets = uniqueMarkets.filter(m =>
        (m.question && m.question.toLowerCase().includes(lowerCaseQuery)) ||
        (m.description && m.description.toLowerCase().includes(lowerCaseQuery)) ||
        (m.slug && m.slug.toLowerCase().replace(/-/g, ' ').includes(lowerCaseQuery))
      );
  }

  const finalMarkets = options.userLimit !== undefined ? filteredMarkets.slice(0, options.userLimit) : filteredMarkets;

  if (combinedError && finalMarkets.length === 0) {
      return { success: false, error: combinedError, markets: [] };
  }
  return { success: true, markets: finalMarkets, error: combinedError };
}};
