# Eliza + Polymarket Plugin Setup Guide

This guide walks you through setting up an Eliza instance with the Polymarket plugin for prediction market interactions.

## Quick Start Summary

1. **Setup Eliza** → Clone and build the main Eliza project
2. **Install Plugin** → Add the Polymarket plugin to your agent
3. **Configure Wallet** → Set up Polygon wallet credentials
4. **Test Features** → Try market reading, trading, and redemption

## Prerequisites

### System Requirements

- **Node.js 18+** and npm
- **Git** for cloning repositories
- **Code editor** (VS Code recommended)

### Financial Requirements

- **Polygon wallet** with:
  - MATIC tokens for gas fees (~$0.10-1.00)
  - USDC for trading (start with $5-10 for testing)

## Part 1: Eliza Installation

### 1.1 Clone Eliza Repository

```bash
# Clone the official Eliza repository
git clone https://github.com/elizaos/eliza.git
cd eliza

# Install dependencies
npm install

# Build the project
npm run build
```

### 1.2 Verify Installation

```bash
# Test that Eliza builds successfully
npm run dev

# You should see Eliza starting up without errors
# Press Ctrl+C to stop
```

## Part 2: Polymarket Plugin Installation

### 2.1 Install Plugin Package

```bash
# If published to npm (recommended):
npm install @elizaos/plugin-polymarket

# For development from source:
cd /path/to/plugin-polymarket
npm install && npm run build
npm link
cd /path/to/eliza
npm link @elizaos/plugin-polymarket
```

### 2.2 Configure Agent Character

Edit or create `agent/src/character.ts`:

```typescript
import { Character } from '@elizaos/core';
import { polymarketPlugin } from '@elizaos/plugin-polymarket';

export const character: Character = {
    name: "PolymarketTrader",
    username: "polymarket_trader",
    bio: "I help you interact with Polymarket prediction markets.",
    
    // Add the Polymarket plugin
    plugins: [polymarketPlugin],
    
    settings: {
        // Optional: Custom API endpoint
        POLYMARKET_API_URL: "https://gamma-api.polymarket.com/markets"
    },
    
    // Other character configuration...
    messageTemplates: [],
    postTemplates: [],
    adjectives: ["analytical", "informed", "strategic"],
    knowledge: [
        "I can help you read prediction market data from Polymarket",
        "I can place buy and sell orders on prediction markets", 
        "I can redeem winnings from resolved markets",
        "I understand market probabilities and odds"
    ]
};
```

## Part 3: Wallet Configuration

### 3.1 Create Test Wallet

⚠️ **Security First**: Never use your main wallet for testing

```bash
# Option 1: MetaMask
# 1. Create new account in MetaMask
# 2. Switch to Polygon network
# 3. Export private key (Account → Export Private Key)

# Option 2: CLI wallet generation
npx @metamask/eth-sig-util generateWallet
```

### 3.2 Fund Your Wallet

1. **Get USDC on Polygon**:
   - Bridge from Ethereum using [bridge.polygon.technology](https://bridge.polygon.technology)
   - Buy directly on centralized exchange
   - Use faucet for small amounts (testing only)

2. **Get MATIC for Gas**:
   - Use [Polygon faucet](https://faucet.polygon.technology) for small amounts
   - Buy on exchange and withdraw to Polygon
   - Bridge from Ethereum

### 3.3 Configure Environment Variables

Create `.env` file in your Eliza project root:

```bash
# Required for trading functionality
POLYGON_WALLET_PRIVATE_KEY=0x1234567890abcdef...

# Alternative: Polymarket API credentials (if available)
POLYMARKET_API_KEY=your_api_key
POLYMARKET_API_SECRET=your_api_secret
POLYMARKET_API_PASSPHRASE=your_passphrase

# Optional: Custom API endpoint
POLYMARKET_API_URL=https://gamma-api.polymarket.com/markets

# Security: Ensure .env is in .gitignore
echo ".env" >> .gitignore
```

## Part 4: Launch and Test

### 4.1 Start Eliza

```bash
cd /path/to/eliza

# Development mode
npm run dev

# Production mode
npm start
```

### 4.2 Basic Functionality Tests

#### Test 1: Market Reading (No wallet required)

```
You: "Show me the top prediction markets on Polymarket"

Expected Response:
Here are the top 5 prediction markets on Polymarket:
1. "Will Bitcoin reach $100k in 2024?" - Yes: $0.65, No: $0.35
2. "Will AI achieve AGI by 2025?" - Yes: $0.30, No: $0.70
...
```

#### Test 2: Buy Order (Requires wallet + USDC)

```
You: "Buy 1 token of abc123 at $0.60 on Polymarket"

Expected Response:
Successfully placed buy order!
📊 Order Details:
- Token ID: abc123
- Price: $0.60 per token
- Size: 1 tokens
- Total Cost: $0.60
...
```

#### Test 3: Position Management

```
You: "Show me my positions"
You: "Sell 1 token of abc123 at $0.70"
```

#### Test 4: Redemption (Requires resolved markets)

```
You: "Show me my winnings on Polymarket"
You: "Redeem all my positions"
```

## Part 5: Advanced Configuration

### 5.1 Custom Message Templates

Enhance your character with trading-specific templates in `character.ts`:

```typescript
messageTemplates: [
    {
        name: "market_analysis",
        template: "Based on current market data, {{marketName}} shows {{probability}}% probability for {{outcome}}. Volume is {{volume}} with {{liquidity}} liquidity."
    },
    {
        name: "trade_confirmation", 
        template: "Order placed: {{orderType}} {{size}} tokens at ${{price}}. Total: ${{total}}. Order ID: {{orderId}}"
    }
]
```

### 5.2 Performance Optimization

```bash
# Add to package.json scripts
"scripts": {
    "start:polymarket": "NODE_ENV=production npm start",
    "dev:polymarket": "NODE_ENV=development npm run dev"
}
```

### 5.3 Logging Configuration

Create `config/logging.ts`:

```typescript
export const loggingConfig = {
    level: 'info',
    polymarket: {
        logTrades: true,
        logPrices: false,
        logErrors: true
    }
};
```

## Security Best Practices

### Private Key Security

1. **Environment Variables Only**:
   ```bash
   # ✅ Good - environment variable
   POLYGON_WALLET_PRIVATE_KEY=0x...
   
   # ❌ Bad - hardcoded in code
   const privateKey = "0x123...";
   ```

2. **Use .env.example**:
   ```bash
   # Create template without actual keys
   cp .env .env.example
   # Remove actual values from .env.example
   ```

3. **Key Rotation**:
   ```bash
   # Regularly rotate test keys
   # Never reuse production keys for testing
   ```

### Transaction Security

1. **Start Small**: Begin with $1-2 transactions
2. **Test Networks**: Use testnets when possible
3. **Monitor Gas**: Keep MATIC balance for gas fees
4. **Rate Limiting**: Don't spam transactions

### Operational Security

1. **Monitoring**:
   ```bash
   # Monitor wallet balance
   # Track transaction history
   # Set up alerts for large transactions
   ```

2. **Backup Strategy**:
   ```bash
   # Backup private keys securely
   # Document recovery procedures
   # Test recovery process
   ```

## Troubleshooting

### Common Issues

#### 1. Plugin Not Loading

```bash
# Check plugin installation
npm list @elizaos/plugin-polymarket

# Verify character.ts imports
grep -n "polymarket" agent/src/character.ts

# Check for build errors
npm run build 2>&1 | grep -i error
```

#### 2. Wallet Connection Issues

```bash
# Test private key format
node -e "console.log(process.env.POLYGON_WALLET_PRIVATE_KEY?.length)"
# Should output: 66 (64 hex chars + 0x prefix)

# Test wallet balance
# Use Polygon explorer: polygonscan.com
```

#### 3. Transaction Failures

```bash
# Check MATIC balance for gas
# Verify USDC balance for trades
# Confirm network connectivity
curl https://polygon-rpc.com -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

#### 4. API Errors

```bash
# Test Polymarket API
curl "https://gamma-api.polymarket.com/markets?limit=1"

# Check rate limiting
# Verify endpoint accessibility
```

### Error Resolution

#### TypeError: Cannot read property 'validate'

```typescript
// Check plugin registration in character.ts
plugins: [polymarketPlugin], // Ensure this line exists
```

#### Network Error / Timeout

```bash
# Add timeout configuration to .env
POLYMARKET_REQUEST_TIMEOUT=30000
POLYGON_RPC_TIMEOUT=10000
```

#### Insufficient Funds

```bash
# Check balances before trading
# Ensure gas buffer (keep 0.01+ MATIC)
# Verify USDC allowances
```

## Performance Optimization

### Response Time

1. **API Caching**:
   ```typescript
   // Add to character settings
   settings: {
       CACHE_MARKET_DATA: "60000", // 1 minute cache
       BATCH_REQUESTS: "true"
   }
   ```

2. **Connection Pooling**:
   ```bash
   # Add to .env
   POLYMARKET_MAX_CONNECTIONS=5
   POLYGON_CONNECTION_POOL_SIZE=3
   ```

### Memory Usage

1. **Monitor Resources**:
   ```bash
   # Check memory usage
   node --max-old-space-size=4096 npm start
   ```

2. **Cleanup Strategy**:
   ```typescript
   // Add cleanup routines
   process.on('SIGINT', () => {
       // Close connections
       // Clear caches
       process.exit(0);
   });
   ```

## Next Steps

### Testing Checklist

- [ ] Market data retrieval works
- [ ] Buy orders execute successfully  
- [ ] Sell orders process correctly
- [ ] Redemption functions properly
- [ ] Error handling is robust
- [ ] Security measures are effective

### Production Deployment

1. **Monitoring Setup**:
   - Transaction monitoring
   - Balance alerts
   - Error tracking
   - Performance metrics

2. **Backup Procedures**:
   - Private key backup
   - Configuration backup
   - Recovery testing
   - Documentation updates

3. **Scaling Considerations**:
   - Multiple wallet support
   - Load balancing
   - Rate limit handling
   - Database integration

### Community Resources

- **Documentation**: [Eliza Docs](https://elizaos.github.io)
- **Polymarket API**: [Polymarket Docs](https://docs.polymarket.com)
- **Support**: GitHub Issues, Discord Community
- **Examples**: Check `INTEGRATION_TESTING.md` for detailed testing scenarios

## Support

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review `INTEGRATION_TESTING.md` for test scenarios  
3. Check GitHub issues for known problems
4. Join the community Discord for help
5. Open an issue with detailed error information

Remember: Start with small amounts and test thoroughly before deploying to production!