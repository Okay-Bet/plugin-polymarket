export const buySharesModel = `
 User wants to buy shares on Polymarket.
 Extract the following information:
 - marketId: The ID of the market.
 - outcome: The outcome they want to buy (e.g., "Yes", "No").
 - quantity: The number of shares to buy.

 User message: "{{text}}"
 `;

export const sellSharesModel = `
 User wants to sell shares on Polymarket.
 Extract the following information:
 - marketId: The ID of the market.
 - outcome: The outcome they want to sell (e.g., "Yes", "No").
 - quantity: The number of shares to sell.

 User message: "{{text}}"
 `;

export const readMarketModel = `
 User wants to view information about a specific market on Polymarket.
 Extract the following information:
 - marketId: The ID of the market to view.

 User message: "{{text}}"
 `;

export const readMarketsModel = `
 User wants to view information about markets on Polymarket.
 Extract the following information:
 - query (optional): Keywords or phrases related to the markets they're interested in.
 - limit (optional): The maximum number of markets to display.

 User message: "{{text}}"
 `;

export const redeemSharesModel = `
 User wants to redeem shares on Polymarket for a specific market.
 Extract the following information:
 - marketId: The ID of the market from which to redeem shares.

 User message: "{{text}}"
 `;
