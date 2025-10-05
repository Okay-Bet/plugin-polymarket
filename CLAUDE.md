# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm install              # Install dependencies
npm run build            # Build with tsup
npm run dev              # Run ElizaOS in dev mode
npm start                # Run ElizaOS

# Code quality
npm run lint             # Format code with Prettier
npm run format           # Same as lint
npm run format:check     # Check formatting without changes
```

### Testing
```bash
npm test                 # Run all tests (component + e2e)
npm run test:component   # Vitest unit tests only
npm run test:e2e         # ElizaOS integration tests only
npm run test:coverage    # Coverage report with Vitest
npm run test:watch       # Watch mode for tests

# Run specific test file
npx vitest run __tests__/actions.test.ts
npx vitest run --reporter=verbose  # Detailed output
```

## Architecture

### Plugin Structure
```
plugin-polymarket/
├── src/
│   ├── actions/         # 16 trading actions
│   │   ├── placeOrder.ts
│   │   ├── sellOrder.ts
│   │   ├── redeemWinnings.ts
│   │   ├── redeemWinningsEnhanced.ts
│   │   ├── searchMarkets.ts
│   │   ├── explainMarket.ts
│   │   ├── getMarketPrice.ts
│   │   ├── getPortfolioPositions.ts
│   │   ├── getWalletBalance.ts
│   │   ├── depositUSDC.ts
│   │   ├── approveUSDC.ts
│   │   ├── setupTrading.ts
│   │   ├── getOrderBookSummary.ts
│   │   ├── syncMarkets.ts
│   │   ├── showFavoriteMarkets.ts
│   │   └── getAccountAccessStatus.ts
│   ├── services/        # Background services
│   │   ├── MarketSyncService.ts    # 24-hour market sync
│   │   ├── MarketDetailService.ts  # Market info fetching
│   │   └── RedemptionService.ts    # Auto-redemption
│   ├── providers/       # Context providers
│   │   └── marketDataProvider.ts   # Market context injection
│   ├── db/             # Database layer
│   │   ├── schema.ts   # Drizzle ORM schemas
│   │   └── queries.ts  # Database operations
│   ├── utils/          # Utilities
│   │   ├── clob.ts     # CLOB API client
│   │   ├── wallet.ts   # Wallet operations
│   │   └── market.ts   # Market helpers
│   ├── templates/      # LLM prompt templates
│   ├── types.ts        # TypeScript definitions
│   ├── plugin.ts       # Plugin configuration
│   └── index.ts        # Public exports
└── __tests__/          # Test suite
    ├── actions.test.ts
    ├── plugin.test.ts
    ├── provider.test.ts
    └── mocks/
```

### Action Pattern
Each action implements the `IAction` interface from ElizaOS:
```typescript
interface IAction {
  name: string;
  description: string;
  validate: (runtime: IAgentRuntime, message: Memory) => Promise<boolean>;
  handler: (runtime: IAgentRuntime, message: Memory, state?: State) => Promise<boolean>;
  examples: Array<{ user: string; content: { text: string } }>;
}
```

### Service Pattern
Services extend ElizaOS `Service` class:
```typescript
class MarketSyncService extends Service {
  async initialize(runtime: IAgentRuntime): Promise<void>
  async start(): Promise<void>
  async stop(): Promise<void>
}
```

### Provider Pattern
Providers implement `IProvider` interface:
```typescript
interface IProvider {
  get: (runtime: IAgentRuntime, message: Memory) => Promise<string>;
}
```

## Key Implementation Details

### CLOB API Integration
- Uses `@polymarket/clob-client` for order management
- Automatic credential derivation from private key
- L1 and L2 authentication handled transparently

### Market Data Management
- Local PGLite database for market caching
- Drizzle ORM for type-safe queries
- 24-hour background sync of 1000+ markets
- Efficient search with local indexing

### Trading Flow
1. **Setup**: `approveUSDC` → `setupTrading`
2. **Discovery**: `searchMarkets` → `explainMarket`
3. **Analysis**: `getMarketPrice` → `getOrderBookSummary`
4. **Execution**: `placeOrder` or `sellOrder`
5. **Management**: `getPortfolioPositions` → `redeemWinnings`

### Error Handling
- Comprehensive validation in each action
- Graceful degradation on API failures
- Detailed error messages for debugging
- Automatic retry logic for network issues

## Environment Configuration

### Required
```env
WALLET_PRIVATE_KEY=0x...  # Ethereum private key for trading
```

### Optional
```env
CLOB_API_URL=https://clob.polymarket.com  # CLOB endpoint (default)
CLOB_API_KEY=...          # Optional L2 API key
PGLITE_DATA_DIR=./.eliza/.elizadb  # Database location
```

## Testing Strategy

### Unit Tests (Vitest)
- Mock runtime and dependencies
- Test action validation logic
- Verify handler responses
- Coverage target: 80%+

### Integration Tests (ElizaOS)
- Full plugin initialization
- End-to-end action flows
- Service lifecycle testing
- Database operations

### Test Utilities
```typescript
// Common test setup in __tests__/setup/
createMockRuntime()       // Mock IAgentRuntime
createTestMessage()       // Mock Memory object
setupTestDatabase()       // In-memory PGLite
```

## Development Workflow

### Adding a New Action
1. Create action file in `src/actions/`
2. Implement IAction interface
3. Add to exports in `src/index.ts`
4. Write tests in `__tests__/`
5. Update README documentation

### Modifying Database Schema
1. Update `src/db/schema.ts`
2. Run migrations if needed
3. Update queries in `src/db/queries.ts`
4. Test with `npm run test:component`

### Publishing to NPM
```bash
npm run build            # Build distribution
npm test                 # Verify all tests pass
npm version patch/minor  # Bump version
npm publish --access public
```

## Build Configuration

### tsup Configuration
- Entry: `src/index.ts`
- Format: ESM only
- External: Node built-ins, heavy dependencies
- Source maps enabled
- Clean output directory

### TypeScript Configuration
- Strict mode enabled
- Target: ES2022
- Module: ESNext
- Path aliases for `@elizaos/core`

## Common Issues & Solutions

### Issue: "Cannot find module '@elizaos/core'"
**Solution**: Ensure ElizaOS is installed as peer dependency

### Issue: CLOB API authentication fails
**Solution**: Check WALLET_PRIVATE_KEY format (must start with 0x)

### Issue: Market sync takes too long
**Solution**: Reduce batch size in MarketSyncService

### Issue: Tests timeout
**Solution**: Increase timeout in vitest.config.ts

## Performance Optimization

### Database Queries
- Use indexed columns for searches
- Batch inserts for market sync
- Connection pooling for concurrent requests

### API Rate Limiting
- Respect CLOB API rate limits
- Implement exponential backoff
- Cache frequently accessed data

### Memory Management
- Clear old market data periodically
- Limit in-memory cache size
- Use streaming for large datasets

## Security Best Practices

### Private Key Management
- Never log private keys
- Use environment variables only
- Validate key format before use

### API Security
- Validate all user inputs
- Sanitize market IDs
- Use parameterized queries

### Error Messages
- Don't expose sensitive data
- Log errors securely
- Provide user-friendly messages

## 🚨 Critical Fix: Redemption Action Issues

### Problem Summary
The redemption actions (`redeemWinnings` and `redeemWinningsEnhanced`) are failing due to:
1. **Stale API Data**: data-api.polymarket.com returns outdated positions from 2020
2. **Wrong Data Source**: Relies on unreliable public API instead of CLOB client
3. **No Fallback**: Single point of failure with no alternative data sources
4. **Poor Market Filtering**: Insufficient filtering of old/invalid markets

### Solution Implementation Plan

#### Phase 1: Data Source Hierarchy
Implement fallback chain for position fetching:
```typescript
1. CLOB Client (authenticated, most reliable)
   ↓ fallback
2. Direct CLOB API with credentials
   ↓ fallback  
3. gamma-api.polymarket.com
   ↓ fallback
4. data-api.polymarket.com (last resort)
```

#### Phase 2: Market Validation
Add comprehensive market validation:
- Check `market.endDate > 6 months ago`
- Verify `conditionId` exists on-chain
- Confirm `payoutDenominator > 0`
- Check user has actual token balance

#### Phase 3: Implementation Steps

**Step 1: Update Position Fetching**
- Integrate CLOB client for primary position fetching
- Add multiple fallback APIs (gamma-api, data-api)
- Implement position caching to reduce API calls

**Step 2: Improve Market Resolution Detection**
- Check on-chain payout configuration first
- Validate market end dates (exclude pre-2024 markets)
- Verify position sizes match on-chain balances

**Step 3: Enhanced Error Handling**
- Graceful degradation when APIs fail
- Detailed logging for debugging
- User-friendly error messages

**Step 4: Testing Strategy**
- Unit tests for each component
- Integration tests with mock data
- Live testing on mainnet with small positions

### Code Changes Required
1. **Add CLOB client to redemption action** (`src/actions/redeemWinnings.ts`)
2. **Implement position fetching hierarchy** (`src/utils/positions.ts`)
3. **Add market validation helpers** (`src/utils/marketValidation.ts`)
4. **Improve logging throughout** (all redemption-related files)
5. **Add retry logic** for transient failures
6. **Create comprehensive test suite** (`__tests__/redemption.test.ts`)

### Testing Checkpoints
- ✅ Can fetch positions from CLOB
- ✅ Correctly identifies resolved markets
- ✅ Filters out old/invalid markets
- ✅ Successfully redeems test position
- ✅ Handles API failures gracefully
- ✅ Logs provide clear debugging info

### Success Metrics
- Redemption success rate > 95%
- No attempts on invalid markets
- Clear error messages for failures
- Average redemption time < 30 seconds
- Zero false positives (attempting already redeemed)

### Implementation Timeline
1. **Hour 1**: Implement CLOB client integration
2. **Hour 2**: Add fallback mechanisms
3. **Hour 3**: Improve validation and filtering
4. **Hour 4**: Write comprehensive tests
5. **Hour 5**: Live testing and refinement
6. **Hour 6**: Documentation and deployment

### Testing Plan

#### Unit Tests
```typescript
// Test position fetching from each source
describe('Position Fetching', () => {
  test('fetches from CLOB client')
  test('falls back to direct CLOB API')
  test('falls back to gamma-api')
  test('falls back to data-api')
})

// Test market resolution detection
describe('Market Resolution', () => {
  test('identifies resolved markets')
  test('filters old markets')
  test('validates payout configuration')
})
```

#### Integration Tests
- Mock successful redemption flow
- Mock API failure scenarios
- Test with various market types (standard, neg risk)

#### Live Testing
- Test with small positions first
- Monitor gas usage
- Verify USDC arrives in wallet
- Check transaction confirmations