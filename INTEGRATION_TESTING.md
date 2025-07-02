# Polymarket Plugin Integration Testing Guide

This guide provides step-by-step instructions for setting up a real Eliza instance with the Polymarket plugin and testing all functionality with actual wallets and markets.

## ⚠️ Important Safety Notes

- **Use test funds only**: Start with small amounts (e.g., $5-10 USDC)
- **Polygon Mainnet**: All Polymarket activity occurs on Polygon mainnet, not testnets
- **Private key security**: Never share or commit private keys
- **Market resolution time**: Most markets take days/weeks to resolve - plan accordingly

## Prerequisites

### System Requirements

- Node.js 18+ and npm
- Git
- A Polygon wallet with:
  - MATIC for gas fees (~$0.10-1.00)
  - USDC for trading (~$5-10 for testing)

### Wallet Setup

1. **Create a dedicated test wallet**:
   ```bash
   # Generate new wallet (use MetaMask, Phantom, or CLI tools)
   # NEVER use your main wallet for testing
   ```

2. **Fund the wallet**:
   - Bridge USDC to Polygon (via bridge.polygon.technology)
   - Get MATIC for gas fees (via faucet or DEX)

3. **Export private key**:
   - In MetaMask: Account → Export Private Key
   - Save securely for environment variables

## Eliza Instance Setup

### 1. Clone and Setup Eliza

```bash
# Clone the main Eliza repository
git clone https://github.com/elizaos/eliza.git
cd eliza

# Install dependencies
npm install

# Build the project
npm run build
```

### 2. Install Polymarket Plugin

```bash
# If published to npm:
npm install @elizaos/plugin-polymarket

# Or link local development version:
cd /path/to/plugin-polymarket
npm link
cd /path/to/eliza
npm link @elizaos/plugin-polymarket
```

### 3. Configure Eliza Agent

Create or modify `agent/src/character.ts`:

```typescript
import { Character } from '@elizaos/core';
import { polymarketPlugin } from '@elizaos/plugin-polymarket';

export const character: Character = {
    name: "PolymarketAgent",
    username: "polymarket_agent",
    plugins: [polymarketPlugin],
    settings: {
        // Optional: Custom Polymarket API endpoint
        POLYMARKET_API_URL: "https://gamma-api.polymarket.com/markets"
    },
    // ... other character configuration
};
```

### 4. Environment Configuration

Create `.env` file in your Eliza project root:

```bash
# Required for order placement and redemption
POLYGON_WALLET_PRIVATE_KEY=your_private_key_here

# Alternative: Polymarket API credentials (if available)
POLYMARKET_API_KEY=your_api_key
POLYMARKET_API_SECRET=your_api_secret  
POLYMARKET_API_PASSPHRASE=your_passphrase

# Optional: Custom API endpoint
POLYMARKET_API_URL=https://gamma-api.polymarket.com/markets
```

### 5. Launch Eliza

```bash
npm run dev
# Or for production:
npm start
```

## Testing Workflow

### Phase 1: Market Reading (No Wallet Required)

Test basic market data fetching without any financial risk.

#### Test Cases:

1. **Basic Market Query**:
   ```
   You: "Show me the top prediction markets on Polymarket"
   Expected: List of active markets with prices
   ```

2. **Topic-Specific Search**:
   ```
   You: "What are the current odds on Bitcoin reaching $100k?"
   Expected: Bitcoin-related markets with outcome prices
   ```

3. **Market Limit Control**:
   ```
   You: "Show me 3 markets about elections"
   Expected: Exactly 3 election-related markets
   ```

4. **Inactive Markets**:
   ```
   You: "Show me inactive markets about sports"
   Expected: Past/resolved sports markets
   ```

#### Validation Checklist:
- [ ] Markets display correctly formatted
- [ ] Prices are reasonable (0-1 range)
- [ ] Market questions are clear
- [ ] Response handles no results gracefully
- [ ] Error handling works for API failures

### Phase 2: Buy Orders (Requires Wallet + Funds)

⚠️ **Use small amounts only** - Start with $1-2 per order

#### Pre-Testing Setup:
1. Verify wallet has USDC and MATIC
2. Choose a market with good liquidity (>$10k volume)
3. Check current market prices on polymarket.com

#### Test Cases:

1. **Basic Buy Order**:
   ```
   You: "Buy 2 tokens of [token_id] at $0.65 on Polymarket"
   Expected: Order placement confirmation with details
   ```

2. **Market Price Analysis**:
   ```
   # First check current prices
   You: "Show me the Bitcoin $100k markets"
   # Then place order slightly below market price
   You: "Buy 1 token at $0.05 below current price"
   ```

3. **Order Validation**:
   ```
   You: "Buy 10 tokens at $1.50"  # Invalid price
   Expected: Validation error (price must be 0-1)
   ```

#### Manual Verification:
- [ ] Check Polymarket.com for order in "My Bets"
- [ ] Verify USDC balance decreased
- [ ] Confirm order appears in transaction history
- [ ] Test order cancellation if needed

### Phase 3: Sell Orders (Requires Existing Positions)

#### Prerequisites:
- Must have positions from buy orders above
- Allow time for orders to fill (may take minutes/hours)

#### Test Cases:

1. **Position Exit**:
   ```
   You: "Sell 1 token of [token_id] at $0.70"
   Expected: Sell order placement
   ```

2. **Profit Taking**:
   ```
   You: "Sell half my position at current market price"
   Expected: Partial position liquidation
   ```

3. **Price Warnings**:
   ```
   You: "Sell my tokens at $0.10"  # Very low price
   Expected: Warning about low sell price
   ```

#### Manual Verification:
- [ ] Verify sell order appears on Polymarket
- [ ] Check position sizes decreased correctly
- [ ] Monitor USDC balance changes when orders fill

### Phase 4: Redemption Testing (Requires Resolved Markets)

⚠️ **Note**: This requires markets to actually resolve, which can take days/weeks

#### Test Setup:
- Need positions in markets close to resolution
- Monitor markets approaching end dates
- Wait for official resolution and settlement

#### Test Cases:

1. **Check Redeemable Positions**:
   ```
   You: "Show me my winnings on Polymarket"
   Expected: List of redeemable positions (if any)
   ```

2. **Redeem All Winnings**:
   ```
   You: "Redeem all my positions on Polymarket"
   Expected: Batch redemption of winning positions
   ```

3. **Individual Redemption**:
   ```
   You: "Redeem my position in the Bitcoin market"
   Expected: Specific market redemption
   ```

#### Manual Verification:
- [ ] USDC balance increases by redemption amount
- [ ] Transaction hash appears on Polygon explorer
- [ ] Positions no longer show as redeemable
- [ ] Gas fees deducted appropriately

## Advanced Testing Scenarios

### Error Handling

1. **Network Issues**:
   - Disconnect internet during operations
   - Test timeout handling
   - Verify graceful error messages

2. **Insufficient Funds**:
   - Attempt orders larger than USDC balance
   - Try transactions without MATIC for gas
   - Test validation error messages

3. **Invalid Markets**:
   - Reference non-existent token IDs
   - Query resolved markets for trading
   - Test malformed requests

### Edge Cases

1. **Market State Changes**:
   - Markets resolving during interaction
   - Price volatility during order placement
   - Liquidity changes affecting orders

2. **Concurrent Operations**:
   - Multiple buy/sell orders simultaneously
   - Redemption while orders are pending
   - Market data requests during trading

## Security Testing

### Private Key Handling

1. **Environment Variable Security**:
   ```bash
   # Test that keys aren't logged
   grep -r "private" logs/  # Should find nothing
   ```

2. **Memory Leaks**:
   - Monitor for private keys in error messages
   - Check debug output doesn't expose secrets
   - Verify secure cleanup on shutdown

### Transaction Security

1. **Gas Limit Validation**:
   - Test with low gas price settings
   - Verify transactions don't fail due to gas
   - Check gas estimation accuracy

2. **Slippage Protection**:
   - Place orders during volatile periods
   - Test price impact on large orders
   - Verify order execution prices

## Performance Testing

### Response Times

1. **Market Data Fetching**:
   - Measure query response times
   - Test with large result sets
   - Monitor API rate limiting

2. **Order Processing**:
   - Time from command to transaction
   - Monitor blockchain confirmation times
   - Test during network congestion

### Resource Usage

1. **Memory Consumption**:
   - Monitor RAM usage during operations
   - Check for memory leaks in long sessions
   - Test garbage collection efficiency

2. **Network Bandwidth**:
   - Measure API call frequency
   - Test offline functionality
   - Monitor data usage patterns

## Documentation Testing

### User Experience

1. **Command Clarity**:
   - Test with users unfamiliar with prediction markets
   - Verify error messages are helpful
   - Check response formatting readability

2. **Edge Case Guidance**:
   - Test scenarios not covered in docs
   - Verify troubleshooting steps work
   - Check configuration examples accuracy

## Post-Testing Cleanup

### Wallet Management

1. **Position Cleanup**:
   - Close all test positions
   - Redeem any winnings
   - Withdraw remaining USDC

2. **Security Cleanup**:
   - Rotate test private keys
   - Clear environment variables
   - Remove test wallet from systems

### Documentation Updates

1. **Issue Tracking**:
   - Document any bugs found
   - Note performance observations
   - Record user experience feedback

2. **Improvement Suggestions**:
   - Identify confusing interactions
   - Suggest better error messages
   - Propose feature enhancements

## Troubleshooting Common Issues

### Connection Problems

```bash
# Test API connectivity
curl https://gamma-api.polymarket.com/markets

# Check Polygon RPC
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://polygon-rpc.com
```

### Transaction Failures

1. **Insufficient Gas**:
   - Check MATIC balance
   - Increase gas limit in wallet
   - Use gas estimation tools

2. **Order Rejections**:
   - Verify market is still active
   - Check price ranges are valid
   - Confirm sufficient USDC balance

### Plugin Issues

1. **Service Not Found**:
   ```bash
   # Verify plugin registration
   grep -r "polymarket" agent/src/
   ```

2. **Action Validation Fails**:
   - Check message format matches expected patterns
   - Verify keyword recognition
   - Test with simpler commands first

## Success Criteria

A successful integration test should demonstrate:

- [ ] All 4 plugin actions work correctly
- [ ] Real money transactions execute safely
- [ ] Error handling prevents fund loss
- [ ] User experience is intuitive
- [ ] Performance meets expectations
- [ ] Security measures protect private keys
- [ ] Documentation accurately reflects behavior

## Next Steps

After completing integration testing:

1. **Report Results**: Document findings and issues
2. **Update Documentation**: Fix any inaccuracies found
3. **Performance Optimization**: Address any bottlenecks
4. **Security Review**: Validate all security measures
5. **User Training**: Create simplified usage guides
6. **Production Deployment**: Prepare for mainnet usage

Remember: This testing involves real money on mainnet. Always use minimal amounts and maintain security best practices throughout the process.