// test-live-polymarket.mjs
import { polymarketService } from './dist/plugin-polymarket/src/services/polymarketService.js';

async function checkLiveMarkets() {
  console.log("Attempting to fetch live markets from Polymarket...");

  // Optional: If you have a different API URL for testing or a staging environment
  // initializePolymarketConfig({ apiUrl: "YOUR_TEST_API_URL_IF_ANY" });

  try {
    // Test with default options (should get active, liquid markets)
    const defaultOptionsResponse = await polymarketService.fetchMarkets();
    console.log("\n--- Response with Default Options ---");
    if (defaultOptionsResponse.success && defaultOptionsResponse.markets) {
      console.log(`Successfully fetched ${defaultOptionsResponse.markets.length} markets.`);
      if (defaultOptionsResponse.markets.length > 0) {
        console.log("First market details:", JSON.stringify(defaultOptionsResponse.markets[0], null, 2));
        // Log questions of a few markets
        defaultOptionsResponse.markets.slice(0, 3).forEach((market, index) => {
          console.log(`Market ${index + 1} Question: ${market.question} (ID: ${market.id})`);
        });
      }
    } else {
      console.error("Failed to fetch markets or no markets returned.", defaultOptionsResponse.error || '');
    }

    // Test with a specific query
    const queryOptionsResponse = await polymarketService.fetchMarkets({ query: "bitcoin", limit: 3 });
    console.log("\n--- Response with Query: 'bitcoin', Limit: 3 ---");
    if (queryOptionsResponse.success && queryOptionsResponse.markets) {
      console.log(`Successfully fetched ${queryOptionsResponse.markets.length} markets for 'bitcoin'.`);
      if (queryOptionsResponse.markets.length > 0) {
        console.log("First market (bitcoin query):", JSON.stringify(queryOptionsResponse.markets[0], null, 2));
      }
    } else {
      console.error("Failed to fetch markets for 'bitcoin' query.", queryOptionsResponse.error || '');
    }

  } catch (error) {
    console.error("\n--- An unexpected error occurred during the test ---");
    console.error(error);
  }
}

checkLiveMarkets();