# Polymarket Plugin for Eliza

This plugin enhances Eliza with the ability to fetch and display information about prediction markets from Polymarket.

## Core Functionality: Reading Markets

The primary feature of this plugin is the `READ_POLYMARKET_MARKETS` action, which allows users to query Polymarket for current prediction markets.

### How to Interact

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

## Configuration

The plugin uses a pre-configured Polymarket API endpoint. No additional setup is required by the user to access the `readMarkets` functionality.