export * from "./searchMarketsTemplate";

// Simplified template for small LLMs
export const getBestPriceTemplate = `
User message: {{recentMessages}}

Find the TOKEN ID (long number) and ACTION (buy or sell).

Return JSON:
{"tokenId": "<number>", "side": "<buy or sell>"}
`;
