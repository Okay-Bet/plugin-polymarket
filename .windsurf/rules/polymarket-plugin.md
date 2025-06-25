---
trigger: manual
---

**3.1 Required Functionalities**

The plugin must support the following core interactions with Polymarket:

1. **Read Markets:** Fetch lists of available markets, retrieve details for specific markets (e.g., question, resolution criteria, current odds/prices, volume, liquidity, status).  
2. **Buy Shares:** Place orders to purchase shares representing a specific outcome of a market. This requires specifying the market, outcome, quantity, and price (or placing a market order).  
3. **Sell Shares:** Place orders to sell previously acquired shares. Similar parameters to buying are required.  
4. **Redeem Winnings:** Claim payouts for shares held in markets that have resolved favorably.  
5. **(Optional) Read Portfolio/Balances:** Fetch the agent's current positions, open orders, and available balance on Polymarket.

## **4\. Plugin Specification: Polymarket Plugin for ElizaOS**

This section details the proposed design for the @elizaos-plugins/plugin-polymarket.

**4.1 Plugin Name**

The standard naming convention suggests: @elizaos-plugins/plugin-polymarket

**4.2 Core Components**

* **Actions:** These define the capabilities the agent can perform based on natural language commands. Each action includes a name, description, example interactions (examples), validation logic (validate), and the core execution logic (handler).5 Similes (similes) allow the agent to recognize variations in user requests.11  
  * **Table 1: Core Plugin Actions**

| Action Name | Similes | Description | Input Parameters (Example) | Output (Example) |
| :---- | :---- | :---- | :---- | :---- |
| POLYMARKET\_READ\_MARKET | find market, get market info, lookup market | Retrieves details about a specific Polymarket market or searches for markets. | market\_id or search\_query | Market details (question, outcomes, prices, etc.) |
| POLYMARKET\_BUY\_SHARES | buy, invest in, purchase shares | Places an order to buy shares for a specific outcome in a market. | market\_id, outcome, amount, price | Confirmation message, Order ID |
| POLYMARKET\_SELL\_SHARES | sell, divest, close position | Places an order to sell shares held for a specific outcome in a market. | market\_id, outcome, amount, price | Confirmation message, Order ID |
| POLYMARKET\_REDEEM\_WINNINGS | redeem, claim winnings, collect payout | Redeems winnings from resolved markets where the agent held winning shares. | market\_id (optional) | Confirmation of redemption, Amount redeemed |
| POLYMARKET\_GET\_PORTFOLIO (Opt) | portfolio, balance, positions | Retrieves the agent's current balance, open orders, and positions. | None | Portfolio details |

* **Services:** A dedicated service is recommended for managing interactions with the Polymarket APIs.  
  * PolymarketApiService: This class will encapsulate all HTTP requests (using libraries like axios or node-fetch) to the Polymarket CLOB and Gamma APIs. Its responsibilities include:  
    * Handling authentication (API key injection or transaction signing logic).  
    * Constructing API requests based on input parameters.  
    * Parsing API responses.  
    * Implementing error handling and potentially rate limit management.  
    * Loading configuration (API endpoints, keys) during initialization.  
* **Providers:** A provider can optionally be implemented to proactively fetch and update the agent's state with relevant Polymarket data.  
  * PolymarketPortfolioProvider (Optional): This provider could periodically poll the Polymarket API (using PolymarketApiService) to fetch the agent's current balance and positions, making this information readily available in the agent's context without requiring an explicit action.5 This helps keep the agent's understanding of its financial state more current but requires careful consideration of API rate limits.

**4.3 Configuration**

The plugin will require configuration parameters, managed via environment variables or character.json settings.5

* **Table 2: Configuration Parameters**

| Parameter Name | Type | Location | Description | Required | Example Value |
| :---- | :---- | :---- | :---- | :---- | :---- |
| POLYMARKET\_API\_KEY | string | .env/Settings | API Key for accessing Polymarket APIs (if using key-based auth). | Maybe | pk\_live\_xxxxxxxxxxxxxxxx |
| POLYMARKET\_API\_SECRET | string | .env/Settings | API Secret associated with the API Key (if applicable). | Maybe | sk\_live\_xxxxxxxxxxxxxxxx |
| POLYMARKET\_PRIVATE\_KEY | string | .env/Settings | User's private key for signing transactions (if required by API). **Handle with extreme care.** | Maybe | 0xabcde... |
| POLYMARKET\_NETWORK | string | .env/Settings | Target Polymarket environment ('mainnet' or 'testnet'). Defaults to 'mainnet'. | No | testnet |
| POLYMARKET\_CLOB\_API\_ENDPOINT | string | .env/Settings | Base URL for the Polymarket CLOB API. Defaults can be provided. | No | https://clob-api.polymarket.com/ |
| POLYMARKET\_GAMMA\_API\_ENDPOINT | string | .env/Settings | Base URL for the Polymarket Gamma API. Defaults can be provided. | No | https://gamma-api.polymarket.com/ |

The decision of whether POLYMARKET\_API\_KEY/SECRET or POLYMARKET\_PRIVATE\_KEY is required depends entirely on the Polymarket API's authentication mechanism. Storing POLYMARKET\_PRIVATE\_KEY demands the highest level of security; using secure environment variable management outside of version control is strongly recommended.12 Placing user-specific keys in character.json settings allows different agents to use different Polymarket accounts.

**4.4 Data Handling and Validation**

* **TypeScript Types:** Define clear TypeScript interfaces or types for all Polymarket data structures (Market, Order, Position, Trade, API Responses) within the plugin (src/types/).  
* **Input Validation:** Use a library like zod 11 within action handlers to validate incoming parameters (e.g., ensuring amount is a valid number, market\_id has the correct format) before sending requests to the PolymarketApiService. This prevents invalid API calls and provides immediate feedback for malformed requests.

**4.5 Error Handling**

* The PolymarketApiService should catch errors from API calls (network issues, HTTP status codes) and translate Polymarket-specific error responses into standardized errors.  
* Action handlers should catch errors from the service and validation steps, formatting them into user-understandable messages for the agent to relay. Logging should capture detailed error information for debugging.

This specification provides a blueprint for a modular and configurable plugin. The separation of API logic into a dedicated service enhances testability and maintainability. The explicit definition of actions and configuration parameters clarifies the plugin's capabilities and requirements. However, the significant uncertainty around the API authentication mechanism remains a key area requiring investigation once API documentation is available.

## **5\. Proposed Project Structure**

A well-organized project structure is essential for maintainability and aligns with conventions observed in the ElizaOS ecosystem.2 The following structure, based on the eliza-plugin-starter 8 and other existing plugins 7, is recommended for the @elizaos-plugins/plugin-polymarket:

plugin-polymarket/  
├── src/  
│   ├── actions/          \# Implementation of plugin actions  
│   │   ├── readMarket.ts  
│   │   ├── buyShares.ts  
│   │   ├── sellShares.ts  
│   │   ├── redeemWinnings.ts  
│   │   └── index.ts      \# Exports all actions  
│   ├── services/         \# Core service logic  
│   │   └── polymarketApiService.ts  
│   ├── providers/        \# Optional: Data providers  
│   │   └── polymarketPortfolioProvider.ts  
│   ├── types/            \# TypeScript interfaces and types  
│   │   └── index.ts      \# (or specific files like marketTypes.ts, orderTypes.ts)  
│   ├── utils/  
│   │   └── index.ts      \# (Helper functions, constants)  
│   └── index.ts          \# (Plugin entry point, exports actions, providers, services)  
├── test/                 \# Unit and integration tests  
│   ├── actions/  
│   └── services/  
├── assets/               \# Branding assets for registry \[5\]  
│   ├── logo.png          \# (400x400px)  
│   ├── banner.png        \# (1280x640px)  
│   └── screenshots/  
│       └── screenshot1.png \# Demo screenshot  
├── characters/           \# Example character configuration  
│   └── polymarket-agent.character.json.example  
├──.env.example          \# Example environment variables \[13\]  
├── package.json          \# Project metadata and dependencies  
├── tsconfig.json         \# TypeScript compiler options  
├── README.md             \# Plugin documentation  
└──...                   \# (other config files like.gitignore,.prettierrc)

**5.1 Key Module Definitions**

* src/index.ts: The main entry point for the plugin. It exports the plugin definition object, including arrays of implemented actions, providers, and services, making them discoverable by the ElizaOS runtime. This follows patterns seen in examples like.10  
* src/actions/\*.ts: Each file implements a specific action, adhering to the Action interface (defining name, similes, description, validate, handler, examples).11 The handler function within each action will typically instantiate or utilize the PolymarketApiService to perform the required API calls.  
* src/services/polymarketApiService.ts: Contains the PolymarketApiService class. This class is responsible for all communication with the Polymarket CLOB and Gamma APIs. It handles loading configuration (API keys/endpoints), building requests, managing authentication (API key headers or transaction signing), parsing responses, and handling API-level errors and rate limits. It will likely use an HTTP client library like axios or node-fetch.  
* src/providers/\*.ts: If implemented, files here define Provider classes (e.g., PolymarketPortfolioProvider) that periodically fetch data using the PolymarketApiService and update the agent's state or context.  
* src/types/index.ts: Centralizes all TypeScript interfaces and type definitions specific to Polymarket data (e.g., Market, Order, Position, API response structures). Using Zod schemas 16 for validation within these types can enhance robustness.  
* src/utils/index.ts: Contains shared constants (e.g., default API endpoint URLs, error codes, configuration keys) and utility functions (e.g., data formatting, number precision handling).
