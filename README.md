# Polymarket Plugin for Eliza

This plugin enhances Eliza with the ability to fetch and display information about prediction markets from Polymarket, and place buy/sell orders on those markets.

## Core Functionality

### 1. Reading Markets

The `READ_POLYMARKET_MARKETS` action allows users to query Polymarket for current prediction markets.

#### How to Interact

You can ask Eliza to retrieve market information using natural language. The plugin is designed to understand various phrasings.

**Example Queries:**

*   To see top markets:
    *   `Show me the top prediction markets on Polymarket`
    *   `What are some popular markets?` (if context points to Polymarket)
*   To find markets on a specific topic:
    *   `What are the current odds on Polymarket about Bitcoin?`
    *   `Find markets for "AI safety"`
*   To specify the number of markets:
    *   `Show me 3 markets about "elections"`
*   To include inactive markets:
    *   `List all markets from Polymarket about "tech stocks"` (shows active and inactive)
    *   `Show me inactive markets for "sports"`

### Expected Output

Eliza will respond with a summarized list of the markets found, including the market question and the current price for each outcome.

**Example Response (Successful Fetch):**
```
Here are the top 2 prediction markets about "AI safety" on Polymarket:
1. "AI safety market 1?" - Yes: $0.70, No: $0.30
2. "AI safety market 2?" - No: $0.30
```

**Example Response (No Markets Found):**
```
Sorry, I couldn't find any prediction markets about "an obscure topic".
```

**Example Response (Service Error):**
```
Sorry, there was an error fetching prediction markets: [Specific error message from service]
```

### 2. Buy Orders

The `BUY_POLYMARKET_ORDER` action allows users to place buy orders for prediction market tokens.

#### How to Interact

You can ask Eliza to place buy orders using natural language. The plugin will extract order parameters from your message.

**Example Queries:**

*   Basic buy order:
    *   `Buy 10 tokens of token abc123 at $0.65 on Polymarket`
    *   `Place a buy order for 5 tokens (ID: xyz789) at $0.40`
    *   `I want to purchase 20 tokens at $0.75 for token def456`

*   Market vs Limit orders:
    *   All orders are limit orders by default (GTC - Good Till Cancelled)
    *   Market orders can be simulated by setting a high price

#### Expected Output

Eliza will validate your order parameters and attempt to place the order.

**Example Response (Successful Order):**
```
Successfully placed buy order!
📊 Order Details:
- Token ID: abc123
- Price: $0.65 per token
- Size: 10 tokens
- Total Cost: $6.50
- Order Type: GTC
- Status: pending
- Order ID: order_123456

⚠️ Note: This is currently a simulation. Real order placement requires wallet configuration.
```

**Example Response (Validation Error):**
```
Invalid order parameters: Price must be between 0 and 1
```

**Example Response (Missing Information):**
```
I couldn't understand your buy order request. Please specify the token ID, price, and amount you want to buy.
```

#### Wallet Configuration Required

To place real orders (not simulations), you need to configure wallet credentials:

```bash
# Required: Polygon wallet private key
POLYGON_WALLET_PRIVATE_KEY=your_private_key_here

# Alternative: Polymarket API credentials  
POLYMARKET_API_KEY=your_api_key
POLYMARKET_API_SECRET=your_api_secret
POLYMARKET_API_PASSPHRASE=your_passphrase
```

⚠️ **Security Note**: Never commit private keys to version control. Use environment variables or secure configuration management.

### 3. Sell Orders

The `SELL_POLYMARKET_ORDER` action allows users to place sell orders to liquidate their prediction market token positions.

#### How to Interact

You can ask Eliza to place sell orders using natural language. The plugin will extract order parameters from your message.

**Example Queries:**

*   Basic sell order:
    *   `Sell 15 tokens of token xyz789 at $0.85 on Polymarket`
    *   `Place a sell order for 20 tokens (ID: abc123) at $0.60`
    *   `I want to liquidate 25 tokens at $0.45 for token def456`
    *   `Cash out my position: sell 50 tokens at $0.75`

*   Position management:
    *   `Exit my trade on this market` 
    *   `Liquidate my position in this Polymarket outcome`
    *   `Sell my tokens at current market price`

#### Expected Output

Eliza will validate your sell order parameters and attempt to place the order.

**Example Response (Successful Sell Order):**
```
Successfully placed sell order!
📊 Order Details:
- Token ID: xyz789
- Price: $0.85 per token
- Size: 15 tokens
- Total Value: $12.75
- Order Type: GTC
- Status: pending
- Order ID: sell_order_789456

⚠️ Note: This is currently a simulation. Real order placement requires wallet configuration.
```

**Example Response (Validation Error):**
```
Invalid sell order parameters: Size must be greater than 0
```

**Example Response (Missing Information):**
```
I couldn't understand your sell order request. Please specify the token ID, price, and amount you want to sell.
```

#### Sell-Specific Validation

Sell orders include additional validation warnings:

- **Price Warnings**: Very low sell prices trigger warnings suggesting you may want to hold longer
- **Position Awareness**: Reminds you that selling will realize your current profit/loss
- **Market Conditions**: Warns about very high sell prices to ensure they reflect current market conditions

### 4. Redeem Winnings

The `REDEEM_POLYMARKET_POSITIONS` action allows users to claim winnings from resolved prediction markets by converting winning tokens to USDC.

#### How to Interact

You can ask Eliza to redeem your winnings using natural language. The plugin will identify redeemable positions and process the redemption.

**Example Queries:**

*   Show available winnings:
    *   `Show me my winnings on Polymarket`
    *   `What positions can I redeem?`
    *   `Check my redeemable positions`

*   Redeem all positions:
    *   `Redeem all my positions on Polymarket`
    *   `Claim my winnings from prediction markets`
    *   `Cash out all my winnings`
    *   `Collect winnings from resolved markets`

*   Redeem specific positions:
    *   `Redeem my position in market abc123`
    *   `Claim winnings from the Bitcoin market`

#### Expected Output

Eliza will show your redeemable positions or process the redemption.

**Example Response (Available Positions):**
```
Found 2 redeemable positions:

1. **Will Bitcoin reach $100k in 2024?**
   - Winning Outcome: Yes
   - Your Tokens: 50
   - Estimated Payout: $50.00 USDC
   - Status: ✅ Ready to redeem

2. **Will AI achieve AGI by 2025?**
   - Winning Outcome: No
   - Your Tokens: 25
   - Estimated Payout: $25.00 USDC
   - Status: ⏳ Pending settlement

**Total Available for Redemption: $50.00 USDC**

To redeem these positions, say "redeem all my positions on Polymarket" or specify individual positions.
```

**Example Response (Successful Redemption):**
```
✅ Successfully redeemed 2 positions!

💰 **Total Payout: $75.00 USDC**

📊 **Redeemed Positions:**
1. Token abc123: 50 tokens → $50.00 USDC
2. Token def456: 25 tokens → $25.00 USDC

🔗 **Transaction Hash:** 0xabc123...
⛽ **Gas Used:** 0.008 ETH

✨ **Status:** confirmed

💡 The USDC has been transferred to your wallet address.
```

**Example Response (No Winnings):**
```
No redeemable positions found. You may not have any winning positions in resolved markets, or markets may not be settled yet.
```

#### Redemption Requirements

To redeem winnings, the following conditions must be met:

- **Market Resolution**: The prediction market must be officially resolved
- **Payouts Reported**: Market outcomes must be reported to the Conditional Token Framework (CTF) contract
- **Winning Positions**: You must hold tokens representing the winning outcome
- **Wallet Configuration**: Polygon private key or Polymarket API credentials required

#### How Redemption Works

1. **Market Settlement**: After a market resolves, there's a settlement period where outcomes are reported
2. **Position Identification**: The system identifies your positions in resolved markets
3. **Eligibility Check**: Only positions with winning outcomes in settled markets are redeemable
4. **Token Conversion**: Winning tokens are burned and converted to USDC at a 1:1 ratio
5. **Gas Payment**: Transaction fees are paid in MATIC (Polygon's native token)

#### Technical Details

- **Blockchain**: Polygon (Layer 2 Ethereum scaling solution)
- **Token Standard**: ERC1155 conditional tokens backed by USDC
- **Settlement**: 1 winning token = 1 USDC upon redemption
- **Contract**: Gnosis Conditional Token Framework (CTF)
- **Gas Costs**: Typically 0.001-0.01 MATIC per redemption

## Installation & Setup

### Installation
```bash
npm install @elizaos/plugin-polymarket
```

### Configuration

#### Basic Setup
No additional configuration is required for basic functionality. The plugin uses Polymarket's public API endpoint.

#### Advanced Configuration
You can customize the API endpoint through environment variables:

```bash
# Optional: Custom Polymarket API URL
POLYMARKET_API_URL=https://gamma-api.polymarket.com/markets
```

#### Plugin Registration
Add the plugin to your ElizaOS agent configuration:

```typescript
import { PolymarketPlugin } from '@elizaos/plugin-polymarket';

const agent = new ElizaAgent({
  plugins: [PolymarketPlugin],
  // ... other configuration
});
```

## API Response Examples

### Successful Market Fetch
When markets are found, the service returns structured data:

```json
{
  "success": true,
  "markets": [
    {
      "id": "market-123",
      "slug": "bitcoin-100k-2024",
      "question": "Will Bitcoin reach $100k in 2024?",
      "description": "Market resolves to Yes if Bitcoin reaches $100,000...",
      "active": true,
      "volume": 1250000,
      "liquidity": 85000,
      "url": "https://polymarket.com/market/bitcoin-100k-2024",
      "endDate": "2024-12-31T23:59:59Z",
      "outcomes": [
        {
          "clobTokenId": "yes-token-123",
          "name": "Yes",
          "price": 0.65
        },
        {
          "clobTokenId": "no-token-123", 
          "name": "No",
          "price": 0.35
        }
      ]
    }
  ]
}
```

### Error Response
When an error occurs, the service returns:

```json
{
  "success": false,
  "error": "API request failed with status 500"
}
```

## Market Filtering

The plugin automatically filters markets to show the most relevant results:

- **Liquidity Filter**: Markets with ≥ $5,000 liquidity
- **Volume Filter**: Markets with ≥ $20,000 volume  
- **Date Filter**: Markets ending within 3 days (to show active/recent markets)
- **Active Filter**: Only active markets by default (unless "inactive" or "all markets" specified)

## Order Types and Validation

### Supported Order Types

- **GTC (Good-Till-Cancelled)**: Default order type, remains active until filled or manually cancelled
- **GTD (Good-Til-Date)**: Order expires at a specified timestamp
- **FOK (Fill-Or-Kill)**: Order must be completely filled immediately or cancelled

### Order Validation Rules

The plugin validates all order parameters before submission:

- **Token ID**: Must be a valid ERC1155 token identifier
- **Price**: Must be between 0 and 1 (representing probability)
- **Size**: Must be greater than 0
- **Expiration**: Required for GTD orders, must be in the future

### Order Processing Flow

1. **Parameter Extraction**: Natural language parsing to extract order details
2. **Validation**: Comprehensive parameter validation including:
   - Basic parameter checks
   - Token existence verification (against active markets)
   - Wallet configuration validation
   - Price reasonableness warnings
3. **Order Placement**: Submission to Polymarket CLOB API (simulated for now)
4. **Response**: Formatted confirmation with order details

## Development

### Building
```bash
npm run build
```

### Testing
```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

### Project Structure
```
src/
├── actions/
│   ├── readMarkets.ts           # Market data queries
│   ├── buyOrder.ts              # Buy order placement
│   ├── sellOrder.ts             # Sell order placement
│   ├── redeemOrder.ts           # Redeem winnings functionality
│   └── __tests__/
│       ├── readMarket.test.ts   # Market reading tests
│       ├── buyOrder.test.ts     # Buy order tests
│       ├── sellOrder.test.ts    # Sell order tests
│       └── redeemOrder.test.ts  # Redeem functionality tests
├── services/
│   ├── polymarketService.ts     # API service, order management, and redemption
│   └── __tests__/
│       └── polymarketService.test.ts  # Service tests
├── types.ts                     # TypeScript type definitions
└── index.ts                     # Plugin entry point
```