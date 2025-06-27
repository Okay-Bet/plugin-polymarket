import { BigNumberish } from 'ethers';
import { z } from 'zod';

// Helper for date strings if you want to validate them as actual dates
// For now, sticking to z.string() as per original types, but you might refine this:
// const dateStringSchema = z.string().datetime({ offset: true }); // For ISO 8601 with offset
// const simpleDateStringSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
//   message: "Invalid date string",
// });

// PolymarketConfig
export const PolymarketConfigSchema = z.object({
  provider: z.object({
    apiUrl: z.string().optional(),
  }).optional(),
});
export type PolymarketConfig = z.infer<typeof PolymarketConfigSchema>;

// PolymarketOutcome
export const PolymarketOutcomeSchema = z.object({
  clobTokenId: z.string(),
  name: z.string(),
  price: z.string(),
});
export type PolymarketOutcome = z.infer<typeof PolymarketOutcomeSchema>;

// PolymarketConditionOutcome
export const PolymarketConditionOutcomeSchema = z.object({
  name: z.string(),
  address: z.string().optional(),
  lastPrice: z.string().optional(),
  priceChange24h: z.string().optional(),
  yesPrice: z.string().optional(),
  noPrice: z.string().optional(),
});
export type PolymarketConditionOutcome = z.infer<typeof PolymarketConditionOutcomeSchema>;

// PolymarketCondition
// Note: Recursive structures often need z.lazy if types refer to each other in a way that
// causes an initialization error. Here, PolymarketCondition references PolymarketConditionOutcome,
// which is defined above, so it should be fine.
export const PolymarketConditionSchema = z.object({
  id: z.string(),
  humanReadableName: z.string(),
  outcomes: z.array(PolymarketConditionOutcomeSchema).optional(),
});
export type PolymarketCondition = z.infer<typeof PolymarketConditionSchema>;

// PolymarketMarket
export const PolymarketMarketSchema = z.object({
  id: z.string(),
  slug: z.string(),
  question: z.string(),
  description: z.string().optional(),
  active: z.boolean(),
  category: z.string().optional(),
  closed: z.boolean().optional(),
  acceptingOrders: z.boolean().optional(),
  new: z.boolean().optional(), // 'new' is a reserved keyword, consider renaming if it causes issues in some JS contexts, though fine in TS types/Zod keys
  volume: z.string(),
  liquidity: z.string(),
  url: z.string().url().optional(), // Assuming URL should be validated as such
  startDate: z.string().optional(), // Consider dateStringSchema if strict date validation is needed
  endDate: z.string().optional(), // Consider dateStringSchema
  outcomes: z.array(PolymarketOutcomeSchema),
  orderMinSize: z.number().optional(),
  orderPriceMinTickSize: z.number().optional(),
  volume24hr: z.number().optional(),
  volume1wk: z.number().optional(),
  volume1mo: z.number().optional(),
  volume1yr: z.number().optional(),
  oneDayPriceChange: z.number().optional(),
  oneHourPriceChange: z.number().optional(),
  oneWeekPriceChange: z.number().optional(),
  oneMonthPriceChange: z.number().optional(),
  lastTradePrice: z.number().optional(),
  bestBid: z.number().optional(),
  bestAsk: z.number().optional(),
  resolutionSource: z.string().optional(),
  resolved: z.boolean().optional(),
  archived: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  conditions: z.array(PolymarketConditionSchema).optional(),
});
export type PolymarketMarket = z.infer<typeof PolymarketMarketSchema>;

// ReadMarketsActionContent
export const ReadMarketsActionContentSchema = z.object({
  text: z.string(),
  source: z.string().optional(),
});
export type ReadMarketsActionContent = z.infer<typeof ReadMarketsActionContentSchema>;

// ReadMarketsData
export const ReadMarketsDataSchema = z.object({
  markets: z.array(PolymarketMarketSchema),
  query: z.string().optional(),
  limit: z.number().optional(),
});
export type ReadMarketsData = z.infer<typeof ReadMarketsDataSchema>;

// ReadMarketsActionParams
export const ReadMarketsActionParamsSchema = z.object({
  query: z.string().optional(),
});
export type ReadMarketsActionParams = z.infer<typeof ReadMarketsActionParamsSchema>;

// PolymarketApiCallParams
export const PolymarketApiCallParamsSchema = z.object({
  id: z.string().optional(),
  slug: z.string().optional(),
  clob_token_ids: z.string().optional(), // Assuming this is a comma-separated string if multiple
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
  active: z.boolean().optional(),
  closed: z.boolean().optional(),
  archived: z.boolean().optional(),
  ascending: z.boolean().optional(),
  liquidity_num_min: z.string().optional(), // API expects string for these range filters
  volume_num_min: z.string().optional(), // API expects string
  category: z.string().optional(),
  start_date_min: z.string().optional(), // Consider dateStringSchema
  start_date_max: z.string().optional(), // Consider dateStringSchema
  end_date_min: z.string().optional(), // Consider dateStringSchema
  end_date_max: z.string().optional(), // Consider dateStringSchema
});
export type PolymarketApiCallParams = z.infer<typeof PolymarketApiCallParamsSchema>;

// MarketCollectionOptions
export const MarketCollectionOptionsSchema = z.object({
  query: z.string().optional(),
  userLimit: z.number().int().optional(),
  liquidityMin: z.string().optional(),
  volumeMin: z.string().optional(),
  daysLookbackForEndDateMin: z.number().int().optional(),
  daysLookbackForNewMarkets: z.number().int().optional(),
  marketStatus: z.enum(['active', 'inactive', 'all']).optional(),
});
export type MarketCollectionOptions = z.infer<typeof MarketCollectionOptionsSchema>;

// PolymarketApiResponse
export const PolymarketApiResponseSchema = z.object({
  success: z.boolean(),
  markets: z.array(PolymarketMarketSchema).optional(),
  error: z.string().optional(),
});
export type PolymarketApiResponse = z.infer<typeof PolymarketApiResponseSchema>;

// GetMarketActionContent
export const GetMarketActionContentSchema = z.object({
  text: z.string(),
  marketId: z.string().optional(),
});
export type GetMarketActionContent = z.infer<typeof GetMarketActionContentSchema>;

// PolymarketSingleMarketApiResponse
export const PolymarketSingleMarketApiResponseSchema = z.object({
  success: z.boolean(),
  market: PolymarketMarketSchema.optional(),
  error: z.string().optional(),
});
export type PolymarketSingleMarketApiResponse = z.infer<typeof PolymarketSingleMarketApiResponseSchema>;

// Raw outcome data structure from Polymarket API
export const PolymarketRawOutcomeSchema = z.object({
  name: z.string(),
  address: z.string().optional(),
  last_price: z.string().optional(),
  price_change_24h: z.string().optional(),
  yes_price: z.string().optional(),
  no_price: z.string().optional(),
});
export type PolymarketRawOutcome = z.infer<typeof PolymarketRawOutcomeSchema>;

// Raw condition data structure from Polymarket API
// This might be recursive if PolymarketRawOutcome could somehow link back or be more complex,
// but as defined, it's a straightforward use.
export const PolymarketRawConditionSchema = z.object({
  id: z.string(),
  human_readable_name: z.string(),
  outcomes: z.array(PolymarketRawOutcomeSchema).optional(),
});
export type PolymarketRawCondition = z.infer<typeof PolymarketRawConditionSchema>;

// Raw market data structure from Polymarket API
export const PolymarketRawMarketSchema = z.object({
  /* ── core identifiers ─────────────────────────────────────────────── */
  id: z.string(),
  slug: z.string(),
  question: z.string(),

  /* ── descriptive metadata ─────────────────────────────────────────── */
  description: z.string().optional(),
  category: z.string().optional(),

  /* ── lifecycle flags & dates (ISO‑8601) ───────────────────────────── */
  startDate: z.string().optional(), // Consider dateStringSchema
  endDate: z.string().optional(), // Consider dateStringSchema
  active: z.boolean(),
  closed: z.boolean().optional(),
  resolved: z.boolean().optional(),
  archived: z.boolean().optional(),
  acceptingOrders: z.boolean().optional(),
  new: z.boolean().optional(),

  /* ── liquidity & volume ───────────────────────────────────────────── */
  liquidity: z.string().optional(),
  volume: z.string().optional(),
  volume24hr: z.number().optional(),
  volume1wk: z.number().optional(),
  volume1mo: z.number().optional(),
  volume1yr: z.number().optional(),

  /* ── price & order parameters ─────────────────────────────────────── */
  orderMinSize: z.number().optional(),
  orderPriceMinTickSize: z.number().optional(),
  oneDayPriceChange: z.number().optional(),
  oneHourPriceChange: z.number().optional(),
  oneWeekPriceChange: z.number().optional(),
  oneMonthPriceChange: z.number().optional(),
  lastTradePrice: z.number().optional(),
  bestBid: z.number().optional(),
  bestAsk: z.number().optional(),

  /* ── outcomes & tokens ───────────────────────────────────────────── */
  // Handling complex union types for API variations:
  outcomes: z.union([
    z.array(z.string()),
    z.array(z.record(z.string(), z.unknown())), // Array of objects with any string keys and unknown values
    z.string(), // Potentially a JSON string or comma-separated list; might need .transform() if parsing is desired
  ]).optional(),
  outcomePrices: z.union([
    z.array(z.string()), // Array of strings (prices)
    z.string(), // Potentially a JSON string or comma-separated list
  ]).optional(),
  clobTokenIds: z.union([
    z.array(z.string()),
    z.string(), // Potentially a JSON string or comma-separated list
  ]).optional(),

  // Assuming conditions might also come in raw form, if not, this could be removed or adjusted.
  // If PolymarketRawMarket can include raw conditions similar to PolymarketMarket including PolymarketCondition:
  // conditions: z.array(PolymarketRawConditionSchema).optional(),
});
export type PolymarketRawMarket = z.infer<typeof PolymarketRawMarketSchema>;


// Type for raw API data from Polymarket API
export const PolymarketApiDataSchema = z.array(PolymarketRawMarketSchema);
export type PolymarketApiData = z.infer<typeof PolymarketApiDataSchema>;

// BuySharesActionContent
export const BuySharesActionContentSchema = z.object({
  text: z.string(),
  marketId: z.string().optional(),
  outcomeId: z.string().optional(),
  amount: z.string().optional(),
  price: z.string().optional(),
});
export type BuySharesActionContent = z.infer<typeof BuySharesActionContentSchema>;

// SellSharesActionContent
export const SellSharesActionContentSchema = z.object({
  text: z.string(),
  marketId: z.string().optional(),
  outcomeId: z.string().optional(),
  amount: z.string().optional(),
  price: z.string().optional(),
});
export type SellSharesActionContent = z.infer<typeof SellSharesActionContentSchema>;

// RedeemWinningsActionContent
export const RedeemWinningsActionContentSchema = z.object({
  text: z.string(),
  marketId: z.string().optional(),
});
export type RedeemWinningsActionContent = z.infer<typeof RedeemWinningsActionContentSchema>;

// OrderParams
export const OrderParamsSchema = z.object({
  //markertAddress: z.string(),
  //marketId: z.string(),
  //outcomeId: z.string(),
  side: z.enum(['BUY', 'SELL']),
  amount: z.string(),
  price: z.string(),
  orderType: z.enum(['LIMIT', 'MARKET']).optional(),
});
export type OrderParams = {marketMakerAddress: string, conditionalTokensAddress: string, returnAmount: BigNumberish, outcomeIndex: BigNumberish, maxOutcomeTokensToSell: BigNumberish};

export type OrderResult = { success: boolean; orderId?: string; message?: string; error?: string };

export interface RedeemParams {
  conditionalTokensAddress: string;
  collateralTokenAddress: string;
  conditionId: string;
  outcomeSlotCount: number;
}
export interface RedeemResult {
  success: boolean;
  message?: string;
  transactionDetails?: any;
  //transactionHash?: string;
  error?: string;
}

export interface SimpleMarket {
    id: number;
    question: string;
    end: string;
    description: string;
    active: boolean;
    funded: boolean;
    rewardsMinSize: number;
    rewardsMaxSpread: number;
    spread: number;
    outcomes: string;
    outcome_prices: string;
    clob_token_ids: string;
}

export interface SimpleEvent {
    id: number;
    ticker: string;
    slug: string;
    title: string;
    description: string;
    active: boolean;
    closed: boolean;
    archived: boolean;
    new: boolean;
    featured: boolean;
    restricted: boolean;
    end: string;
    markets: string;
}
