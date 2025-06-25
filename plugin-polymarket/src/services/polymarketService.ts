import { PolymarketMarket, PolymarketApiResponse, MarketCollectionOptions } from "../types";

let polymarketApiUrl = "https://gamma-api.polymarket.com/markets";

export const initializePolymarketConfig = (config: { apiUrl?: string }): void => {
  if (config.apiUrl) {
    polymarketApiUrl = config.apiUrl;
  }
};

export const polymarketService = {
  fetchMarkets: async (options: MarketCollectionOptions = {}): Promise<PolymarketApiResponse> => {
    const { query = "" } = options; // 'limit' here is the user's desired final count
    const API_FETCH_COUNT = '1000'; // Fixed count for fetching from Polymarket API
    
    try {
      // Calculate date 3 days ago for filtering
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const endDateMin = threeDaysAgo.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      
      // Build query parameters 
      const params = new URLSearchParams({
        limit: API_FETCH_COUNT, // Use fixed count for API request
        offset: '0',
        ascending: 'false',
        end_date_min: endDateMin,
        liquidity_num_min: '5000',
        volume_num_min: '20000'
      });
      
      // Make the API request
      const response = await fetch(`${polymarketApiUrl}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data: any = await response.json();
      
      // Transform API response to our internal format
      const markets: PolymarketMarket[] = data.map((market: any) => {
        let processedOutcomes: { name: string; price: number; clobTokenId: string }[] = [];
        try {
          const outcomeNames = typeof market.outcomes === 'string' ? JSON.parse(market.outcomes) : market.outcomes;
          const outcomePricesStr = typeof market.outcomePrices === 'string' ? JSON.parse(market.outcomePrices) : market.outcomePrices;
          const clobTokenIds = typeof market.clobTokenIds === 'string' ? JSON.parse(market.clobTokenIds) : market.clobTokenIds;

          if (Array.isArray(outcomeNames) && Array.isArray(outcomePricesStr) && Array.isArray(clobTokenIds) && outcomeNames.length === outcomePricesStr.length && outcomeNames.length === clobTokenIds.length) {
            processedOutcomes = outcomeNames.map((name: string, index: number) => ({
              clobTokenId: clobTokenIds[index],
              name: name,
              price: parseFloat(outcomePricesStr[index]) || 0,
            }));
          } else if (market.outcomes || market.outcomePrices) { // Log only if there was an attempt to parse
            console.warn(`Market ID ${market.id}: Mismatch or invalid format in outcomes/outcomePrices. Received outcomes: ${market.outcomes}, Received prices: ${market.outcomePrices}`);
          }
        } catch (e) {
          console.error(`Market ID ${market.id}: Error parsing outcomes/prices JSON strings. Received outcomes: ${market.outcomes}, Received prices: ${market.outcomePrices}`, e);
        }

        return {
          id: market.id,
          slug: market.slug,
          question: market.question,
          description: market.description || "",
          active: market.active,
          closed: market.closed,
          acceptingOrders: market.acceptingOrders,
          new: market.new,
          volume: market.volume || 0,
          liquidity: market.liquidity || 0,
          url: `https://polymarket.com/market/${market.slug}`,
          startDate: market.startDate,
          endDate: market.endDate,
          orderMinSize: market.orderMinSize,
          orderPriceMinTickSize: market.orderPriceMinTickSize,
          volume24hr: market.volume24hr,
          volume1wk: market.volume1wk,
          volume1mo: market.volume1mo,
          volume1yr: market.volume1yr,
          oneDayPriceChange: market.oneDayPriceChange,
          oneHourPriceChange: market.oneHourPriceChange,
          oneWeekPriceChange: market.oneWeekPriceChange,
          oneMonthPriceChange: market.oneMonthPriceChange,
          lastTradePrice: market.lastTradePrice,
          bestBid: market.bestBid,
          bestAsk: market.bestAsk,
          outcomes: processedOutcomes,
        };
      });
      
      let limit = 5;
      const filteredMarkets = markets.filter(m =>
          (m.slug && m.slug.toLowerCase().replace(/-/g, ' ').includes(query.toLowerCase()))
        );
      const finalMarkets = filteredMarkets.slice(0, limit); 
      
      return {
        success: true, markets: finalMarkets
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
