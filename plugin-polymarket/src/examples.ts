import { ActionExample } from "@elizaos/core/v2";

export const getMarketsExamples: ActionExample[][] = [
  [
    {
      name: "{{user1}}",
      content: { text: "Read markets on polymarket" },
    },
    {
      name: "{{agent}}",
      content: {
        text: 'Sure, let me fetch the current markets on Polymarket for you.',
        actions: ["READ_POLYMARKET_MARKETS"],
        action: "READ_POLYMARKET_MARKETS"
      },
    },
  ],
  [
    {
      name: "{{user1}}",
      content: { text: "Show me the top prediction markets on Polymarket" },
    },
    {
      name: "{{agent}}",
      content: {
        text: 'Here are the top 5 prediction markets on Polymarket:\n1. "Will Trump win the 2024 election?" - Yes: $0.52, No: $0.48\n2. "Will Bitcoin exceed $100k in 2024?" - Yes: $0.35, No: $0.65\n3. "Will Google Gen AI release GPT-5 in 2024?" - Yes: $0.72, No: $0.28\n4. "Will SpaceX reach Mars by 2026?" - Yes: $0.15, No: $0.85\n5. "Will the Fed cut rates in June?" - Yes: $0.62, No: $0.38',
        actions: ["READ_POLYMARKET_MARKETS"],
        action: "READ_POLYMARKET_MARKETS"
      },
    },
  ],
  [
    {
      name: "{{user1}}",
      content: {
        text: "What are the current odds on Polymarket about Bitcoin?",
      },
    },
    {
      name: "{{agent}}",
      content: {
        text: 'I found 3 markets about Bitcoin on Polymarket:\n1. "Will Bitcoin exceed $100k in 2024?" - Yes: $0.35, No: $0.65\n2. "Will Bitcoin drop below $40k in May 2024?" - Yes: $0.22, No: $0.78\n3. "Will a Bitcoin ETF be approved in 2024?" - Yes: $0.89, No: $0.11',
        actions: ["READ_POLYMARKET_MARKETS", "REPLY"],
        action: "READ_POLYMARKET_MARKETS"
      },
    },
  ],
];

export const getMarketByIdExamples: ActionExample[][] = [
  [
    {
      name: "{{user1}}",
      content: { text: "Show me details for Polymarket market 138462..." },
    },
    {
      name: "{{agent}}",
      content: {
        text: 'Market "Will event X happen by date Y?" (ID: 138462)\nDescription: Detailed description of the market.\nStatus: Active\nVolume: 100000\nLiquidity: 50000\nEnds: 2024-12-31\nOutcomes:\n- Yes: $0.65\n- No: $0.35\nURL: https://polymarket.com/market/event-x-happen-by-date-y',
        action: "GET_POLYMARKET_MARKET_BY_ID"
      },
    },
  ],
  [
    {
      name: "{{user1}}",
      content: { text: "Get Polymarket data for market 138462..." },
    },
    {
      name: "{{agent}}",
      content: {
        text: 'Market "Another interesting question?" (ID: 138462)\nDescription: Some info about this market.\nStatus: Closed\nVolume: 75000\nLiquidity: 20000\nEnds: 2023-01-15\nOutcomes:\n- Option A: $0.80\n- Option B: $0.20\nURL: https://polymarket.com/market/another-interesting-question',
        action: "GET_POLYMARKET_MARKET_BY_ID"
      },
    },
  ],
];

export const setUserExamples: ActionExample[][] = [
  [
    {
      name: "{{user1}}",
      content: { text: "Set my username to Alice" },
    },
    {
      name: "{{agent}}",
      content: { text: "Username set to Alice." },
    },
  ],
];

export const getUsernameExamples: ActionExample[][] = [
  [
    {
      name: "{{user1}}",
      content: { text: "What is my username?" },
    },
    {
      name: "{{agent}}",
      content: { text: "Your username is: User" }, // Replace "User" with actual default
    },
  ],
];

export const connectWalletExamples: ActionExample[][] = [
  [
    {
      name: "{{user1}}",
      content: { text: "Connect my wallet to Polymarket." },
    },
    {
      name: "{{agent}}",
      content: {
        text: "Connecting your wallet... (In a real app, you'd see a wallet connection prompt)",
        actions: ["CONNECT_WALLET", "REPLY"]
      },
    },
  ],
];

export const getWalletInfoExamples: ActionExample[][] = [
  [
    {
      name: "{{user1}}",
      content: { text: "Show my wallet info." },
    },
    {
      name: "{{agent}}",
      content: {
        text: "Your wallet address: 0x123...789\nBalance: 1.23 ETH",
      },
    },
  ],
];

export const buySharesExamples: ActionExample[][] = [
  [
    {
      name: "{{user1}}",
      content: { text: 'Buy 10 shares of "Yes" in market 123' },
    },
    {
      name: "{{agent}}",
      content: { text: 'Attempting to buy 10 shares of "Yes" in market 123' },
    },
  ],
];

export const sellSharesExamples: ActionExample[][] = [
  [
    {
      name: "{{user1}}",
      content: { text: 'Sell 5 shares of "Yes" in market 123' },
    },
    {
      name: "{{agent}}",
      content: { text: 'Attempting to sell 5 shares of "Yes" in market 123' },
    },
  ],
];

export const redeemSharesExamples: ActionExample[][] = [
  [
    {
      name: "{{user1}}",
      content: { text: "Redeem shares in market 123" },
    },
    {
      name: "{{agent}}",
      content: { text: "Attempting to redeem shares in market 123." },
    },
  ],
];
