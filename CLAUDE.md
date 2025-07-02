# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Build**: `npm run build` - Compiles TypeScript to dist/ directory
- **Test**: `npm test` - Runs all tests with Vitest (single-threaded)
- **Test Watch**: `npm run test:watch` - Runs tests in watch mode
- **Test Coverage**: `npm run test:coverage` - Generates test coverage report
- **Prepare for Publish**: `npm run prepublishOnly` - Builds the project before publishing

## Project Architecture

This is an ElizaOS plugin for Polymarket integration that enables AI agents to fetch and display prediction market data and execute buy/sell orders.

### Core Components

**Plugin Entry Point** (`src/index.ts`):
- Exports the main `polymarketPlugin` with services, actions, and providers
- Includes three main actions: `READ_POLYMARKET_MARKETS`, `BUY_POLYMARKET_ORDER`, `SELL_POLYMARKET_ORDER`
- Initializes with optional API key configuration via `EXAMPLE_API_KEY` setting

**Action System** (`src/actions/readMarkets.ts`):
- Primary action: `READ_POLYMARKET_MARKETS`
- Handles natural language queries about prediction markets
- Validates input with keyword matching (polymarket, prediction market, betting odds)
- Extracts query parameters (topic, limit, active/inactive filter) from user messages
- Formats market data into human-readable responses

**Buy Order System** (`src/actions/buyOrder.ts`):
- Action: `BUY_POLYMARKET_ORDER`
- Handles natural language buy order requests
- Validates input with keyword matching (buy, purchase, order, invest)
- Extracts order parameters (token ID, price, size) from user messages
- Provides comprehensive validation and error handling

**Sell Order System** (`src/actions/sellOrder.ts`):
- Action: `SELL_POLYMARKET_ORDER`
- Handles natural language sell order requests
- Validates input with keyword matching (sell, liquidate, cash out, exit)
- Extracts order parameters (token ID, price, size) from user messages
- Includes sell-specific warnings and position management guidance

**Service Layer** (`src/services/polymarketService.ts`):
- Interfaces with Polymarket's gamma-api endpoint
- Fetches markets with filtering (liquidity > $5k, volume > $20k, end date within 3 days)
- Transforms API response format to internal types
- Handles query-based filtering and user-specified limits
- Validates and executes buy/sell orders with comprehensive error checking
- Manages wallet configuration and authentication

**Type Definitions** (`src/types.ts`):
- Complete TypeScript interfaces for Polymarket data structures
- Includes market metadata, outcomes, pricing, and volume data
- Defines order types (BuyOrderParams, SellOrderParams) and validation structures
- Supports multiple order types (GTC, GTD, FOK) and wallet configurations

### Key Technical Details

- **API Endpoint**: Uses `https://gamma-api.polymarket.com/markets` by default
- **Market Filtering**: Automatically filters for recent, liquid markets unless user specifies "inactive" or "all markets"
- **Query Processing**: Extracts search terms from natural language using regex patterns
- **Response Format**: Structured market listings with outcome names and prices

### Testing Setup

- Uses Vitest with Node.js environment
- Single-threaded execution to avoid race conditions
- Mocks `@elizaos/core` elizaLogger for testing
- Test files located in `src/**/__tests__/` and `src/**/*.{test,spec}.ts`
- Setup file at `tests/setup.ts` handles global configuration and mocking

### Build Configuration

- TypeScript target: ES2022 with ESNext modules
- Bundler module resolution for modern tooling
- Outputs to `dist/` with declarations and source maps
- Strict type checking enabled