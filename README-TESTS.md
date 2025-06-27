# Polymarket Plugin Tests

This document provides specific information about the testing approach for the Polymarket plugin.

## Test Structure

The project uses a standardized testing approach that leverages core test utilities for consistency across the Eliza ecosystem.

### Core Test Utilities

The tests reuse core testing functionality from `@elizaos/core/v2` through a set of utility functions:

- `runCoreActionTests` - Validates action structure and functionality
- `createMockRuntime` - Creates a standardized runtime for testing
- `createMockMessage` - Creates test messages for action testing
- `createMockState` - Creates test state objects

### Test Categories

The test suite covers:

1. **Actions Tests** - Testing all Polymarket actions:
   - Market data: `READ_POLYMARKET_MARKETS` and `GET_POLYMARKET_MARKET_BY_ID` 
   - Trading: `POLYMARKET_BUY_SHARES`, `POLYMARKET_SELL_SHARES`, and `POLYMARKET_REDEEM_WINNINGS`
2. **Service Tests** - Testing the service functionality:
   - `GammaService` for market data API interactions
   - `PolymarketService` for trading operations API interactions
3. **Plugin Structure** - Validating the overall plugin configuration

## Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- actions.test.ts

# Run tests in watch mode
npm test -- --watch
```

## Polymarket-Specific Tests

### Action Tests

#### Market Data Action Tests

Tests for the Polymarket market data actions validate:

- Market list retrieval with various filter parameters
- Single market retrieval by ID
- Error handling for invalid inputs or API failures
- Response formatting for both actions

Example test case structure:

```typescript
describe('readMarketsAction', () => {
  it('should validate action structure', () => {
    expect(readMarketsAction.name).toBe('READ_POLYMARKET_MARKETS');
    expect(readMarketsAction.handler).toBeDefined();
    expect(readMarketsAction.validate).toBeDefined();
  });
  
  it('should retrieve and format active markets', async () => {
    const mockRuntime = createMockRuntime();
    const mockMessage = createMockMessage({
      text: 'Show me prediction markets'
    });
    const mockState = createMockState();
    
    const result = await readMarketsAction.handler(
      mockRuntime,
      mockMessage,
      mockState,
      {},
      mockCallback,
      []
    );
    
    expect(result).toContain('Here are the top');
  });
});
```

#### Trading Action Tests

Tests for the trading actions validate:

- Proper parameter extraction from user messages
- Market validation before placing orders
- API interactions for buy and sell orders
- Winnings redemption logic
- Error handling without try-catch blocks
- Response formatting for trade confirmations

Example test case structure:

```typescript
describe('buySharesAction', () => {
  it('should validate action structure', () => {
    expect(buySharesAction.name).toBe('POLYMARKET_BUY_SHARES');
    expect(buySharesAction.handler).toBeDefined();
    expect(buySharesAction.validate).toBeDefined();
  });
  
  it('should extract parameters and place buy order', async () => {
    const mockRuntime = createMockRuntime();
    const mockMessage = createMockMessage({
      text: 'Buy 50 USD of YES shares in market 138462 at price 0.70'
    });
    const mockState = createMockState();
    
    // Mock GammaService and PolymarketService calls
    jest.spyOn(GammaService, 'fetchMarketById').mockResolvedValue({
      success: true,
      market: { /* mock market data */ }
    });
    
    jest.spyOn(PolymarketService, 'placeOrder').mockResolvedValue({
      success: true,
      orderId: 'mock-order-id',
      message: 'Order placed successfully'
    });
    
    const result = await buySharesAction.handler(
      mockRuntime,
      mockMessage,
      mockState,
      {},
      mockCallback,
      []
    );
    
    expect(result).toContain('Order placed successfully');
    expect(GammaService.fetchMarketById).toHaveBeenCalledWith('138462');
    expect(PolymarketService.placeOrder).toHaveBeenCalledWith({
      marketId: '138462',
      outcomeId: 'YES',
      side: 'BUY',
      amount: '50',
      price: '0.70',
      orderType: 'LIMIT'
    });
  });
});
```

### GammaService Tests

Tests for the GammaService cover:

- API URL construction with various parameters
- Market data transformation 
- Pagination handling
- Error handling for API failures

Example test case structure:

```typescript
describe('GammaService', () => {
  it('should correctly build API URLs', () => {
    const url = GammaService._buildApiUrl({
      active: true,
      limit: 10,
      offset: 0
    });
    expect(url).toContain('active=true');
    expect(url).toContain('limit=10');
  });
  
  it('should transform raw market data', () => {
    const rawData = { /* mock data */ };
    const transformed = GammaService._transformMarketData(rawData);
    expect(transformed.id).toBeDefined();
    expect(transformed.question).toBeDefined();
    expect(transformed.outcomes).toBeInstanceOf(Array);
  });
});
```

### PolymarketService Tests

Tests for the PolymarketService cover:

- Order placement (buy/sell) functionality
- Order cancellation
- Winnings redemption
- Error handling without try-catch blocks
- API key validation
- API response handling

Example test case structure:

```typescript
describe('PolymarketService', () => {
  beforeEach(() => {
    // Mock environment variables
    process.env.POLYMARKET_API_KEY = 'test-api-key';
    
    // Mock global fetch
    global.fetch = jest.fn();
  });
  
  it('should place orders correctly', async () => {
    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ orderId: 'test-order-id' })
    });
    
    const result = await PolymarketService.placeOrder({
      marketId: '138462',
      outcomeId: 'YES',
      side: 'BUY',
      amount: '50',
      price: '0.70',
      orderType: 'LIMIT'
    });
    
    expect(result.success).toBe(true);
    expect(result.orderId).toBe('test-order-id');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/orders'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-api-key'
        })
      })
    );
  });
  
  it('should handle missing API key', async () => {
    delete process.env.POLYMARKET_API_KEY;
    
    const result = await PolymarketService.redeemWinnings({
      marketId: '138462'
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('API key not configured');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
```

## Mocking Strategy

When testing the Polymarket plugin, the following mocking approaches are used:

1. **API Responses** - Mock responses from both Polymarket Gamma API and CLOB API
2. **Runtime Services** - Mock ElizaOS runtime for action testing
3. **User Inputs** - Simulated user messages with various queries and trading parameters
4. **Environment Variables** - Mock API keys for testing authentication

## Testing Trading Actions

For testing the trading functionality, follow these steps:

1. **Mock Dependencies**:
   - Mock the `GammaService.fetchMarketById` method to return a valid market
   - Mock the `PolymarketService.placeOrder` and `PolymarketService.redeemWinnings` methods to simulate successful or failed API responses

2. **Test Parameter Extraction**:
   - Test that action can correctly extract market ID, outcome, amount, and price from user messages
   - Test different message formats and phrasings to ensure robustness

3. **Test API Interactions**:
   - Verify the correct parameters are passed to the PolymarketService methods
   - Test error handling logic when API calls fail

4. **Test Without Try-Catch**:
   - Ensure error handling works properly without try-catch blocks
   - Verify conditional checks are properly implemented

## Writing New Tests

When adding new features to the Polymarket plugin, follow these guidelines:

1. Create dedicated tests for new actions or services
2. Mock any external API calls
3. Test both successful and error scenarios
4. Verify correct market data formatting
5. Ensure proper handling of user queries with different search terms
6. For trading actions, test with various parameter combinations
7. Verify proper API key handling and authentication
