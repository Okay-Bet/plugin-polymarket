import { polymarketService } from './plugin-polymarket/src/services/polymarketService';
import { MarketCollectionOptions } from './plugin-polymarket/src/types';

async function testPolymarketService() {
  console.log('Testing Polymarket Service...');

  try {
    // Test 1: Get current markets with default options
    console.log('\n--- Test 1: getCurrentMarketsAll (default options) ---');
    const currentMarketsResult = await polymarketService.getCurrentMarketsAll();
    console.log(`Success: ${currentMarketsResult.success}`);
    console.log(`Number of markets: ${currentMarketsResult.markets?.length || 0}`);
    if (currentMarketsResult.markets && currentMarketsResult.markets.length > 0) {
      const firstMarket = currentMarketsResult.markets[0];
      console.log('First market sample:');
      console.log(`- ID: ${firstMarket.id}`);
      console.log(`- Question: ${firstMarket.question}`);
      console.log(`- Active: ${firstMarket.active}`);
      console.log(`- Outcomes: ${firstMarket.outcomes?.length || 0}`);
    }

    // Test 2: Get new markets (created in last 7 days)
    console.log('\n--- Test 2: getNewMarketsAll (last 7 days) ---');
    const newMarketsOptions: MarketCollectionOptions = {
      daysLookbackForNewMarkets: 7,
      userLimit: 5
    };
    const newMarketsResult = await polymarketService.getNewMarketsAll(newMarketsOptions);
    console.log(`Success: ${newMarketsResult.success}`);
    console.log(`Number of markets: ${newMarketsResult.markets?.length || 0}`);
    if (newMarketsResult.markets && newMarketsResult.markets.length > 0) {
      console.log('New markets:');
      newMarketsResult.markets.forEach((market, index) => {
        console.log(`${index + 1}. ${market.question} (Start: ${market.startDate})`);
      });
    }

    // Test 3: Search for markets with a specific query
    console.log('\n--- Test 3: Search for markets with query ---');
    const searchOptions: MarketCollectionOptions = {
      query: 'election',
      userLimit: 3
    };
    const searchResult = await polymarketService.getCurrentMarketsAll(searchOptions);
    console.log(`Success: ${searchResult.success}`);
    console.log(`Number of markets matching 'election': ${searchResult.markets?.length || 0}`);
    if (searchResult.markets && searchResult.markets.length > 0) {
      console.log('Search results:');
      searchResult.markets.forEach((market, index) => {
        console.log(`${index + 1}. ${market.question}`);
      });
    }

    // Test 4: Get a specific market by ID
    // Note: You would need a valid market ID for this test
    console.log('\n--- Test 4: Get market by ID ---');
    // Use the ID of the first market from Test 1 if available
    if (currentMarketsResult.markets && currentMarketsResult.markets.length > 0) {
      const marketId = currentMarketsResult.markets[0].id;
      console.log(`Fetching market with ID: ${marketId}`);
      const marketResult = await polymarketService.fetchMarketById(marketId);
      console.log(`Success: ${marketResult.success}`);
      if (marketResult.success && marketResult.market) {
        console.log('Market details:');
        console.log(`- Question: ${marketResult.market.question}`);
        console.log(`- Description: ${marketResult.market.description || 'N/A'}`);
        console.log(`- End date: ${marketResult.market.endDate}`);
        console.log(`- Outcomes: ${marketResult.market.outcomes.map(o => `${o.name}: $${o.price.toFixed(2)}`).join(', ')}`);
      } else {
        console.log(`Error: ${marketResult.error}`);
      }
    } else {
      console.log('No market ID available for testing fetchMarketById');
    }

  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the tests
testPolymarketService().then(() => {
  console.log('\nAll tests completed');
}).catch(error => {
  console.error('Error running tests:', error);
});
