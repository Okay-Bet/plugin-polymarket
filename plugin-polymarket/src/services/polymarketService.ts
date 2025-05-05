import { PolymarketMarket, FetchMarketsOptions, PolymarketApiResponse } from "../types";

let polymarketApiUrl = "https://gamma-api.polymarket.com/markets";

export const initializePolymarketConfig = (config: { apiUrl?: string }): void => {
  if (config.apiUrl) {
    polymarketApiUrl = config.apiUrl;
  }
};

export const polymarketService = {
  fetchMarkets: async (options: FetchMarketsOptions = {}): Promise<PolymarketApiResponse> => {
    const { limit = 100, activeOnly = true, query = "" } = options;
    
    try {
      // Calculate date 3 days ago for filtering
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const endDateMin = threeDaysAgo.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      
      // Build query parameters
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: '0',
        active: activeOnly.toString(),
        ascending: 'false',
        end_date_min: endDateMin,
        liquidity_num_min: '5000',
        volume_num_min: '20000'
      });
      
      // Add query parameter if provided
      if (query) {
        params.append('search', query);
      }
      
      // Make the API request
      const response = await fetch(`${polymarketApiUrl}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform API response to our internal format
      const markets: PolymarketMarket[] = data.map((market: any) => ({
        id: market.id,
        question: market.question,
        description: market.description || "",
        volume: market.volume_num || 0,
        liquidity: market.liquidity_num || 0,
        url: `https://polymarket.com/market/${market.slug}`,
        endDate: market.end_date,
        isActive: market.active,
        outcomes: (market.outcomes || []).map((outcome: any) => ({
          id: outcome.id,
          name: outcome.name,
          probability: outcome.probability_implied || 0,
          price: outcome.price || 0
        }))
      }));
      
      return {
        success: true,
        markets
      };
    } catch (error) {
      console.error("Error fetching markets:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }
};
