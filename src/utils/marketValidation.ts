import { logger } from "@elizaos/core";

export interface MarketInfo {
  conditionId: string;
  question?: string;
  endDate?: string;
  closed?: boolean;
  resolved?: boolean;
  negRisk?: boolean;
  outcome?: string;
  payoutDenominator?: number;
}

/**
 * Fetch market information from gamma-api
 */
export async function fetchMarketFromGammaApi(conditionId: string): Promise<MarketInfo | null> {
  try {
    const url = `https://gamma-api.polymarket.com/markets?conditionId=${conditionId}`;
    logger.info(`[marketValidation] Fetching market info from gamma-api: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      logger.warn(`[marketValidation] Gamma API returned ${response.status} for market ${conditionId}`);
      return null;
    }
    
    const data = await response.json();
    const market = Array.isArray(data) ? data[0] : data;
    
    if (!market) {
      logger.warn(`[marketValidation] No market data found for ${conditionId}`);
      return null;
    }
    
    return {
      conditionId: market.conditionId || conditionId,
      question: market.question,
      endDate: market.endDate || market.end_date_iso,
      closed: market.closed,
      resolved: market.resolved,
      negRisk: market.negRisk || market.neg_risk || market.negative_risk,
      outcome: market.outcome || market.resolved_outcome,
    };
  } catch (error) {
    logger.error(`[marketValidation] Failed to fetch from gamma-api: ${error}`);
    return null;
  }
}

/**
 * Fetch market information from CLOB API
 */
export async function fetchMarketFromClobApi(
  conditionId: string,
  clobApiUrl: string = "https://clob.polymarket.com"
): Promise<MarketInfo | null> {
  try {
    const url = `${clobApiUrl}/markets/${conditionId}`;
    logger.info(`[marketValidation] Fetching market info from CLOB API: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      logger.warn(`[marketValidation] CLOB API returned ${response.status} for market ${conditionId}`);
      return null;
    }
    
    const market = await response.json();
    
    if (!market) {
      logger.warn(`[marketValidation] No market data found for ${conditionId}`);
      return null;
    }
    
    return {
      conditionId: market.condition_id || market.conditionId || conditionId,
      question: market.question || market.title,
      endDate: market.end_date_iso || market.endDate,
      closed: market.closed || market.active === false,
      resolved: market.resolved,
      negRisk: market.neg_risk || market.negRisk,
      outcome: market.outcome,
    };
  } catch (error) {
    logger.error(`[marketValidation] Failed to fetch from CLOB API: ${error}`);
    return null;
  }
}

/**
 * Fetch market information with fallback chain
 */
export async function fetchMarketInfoWithFallback(
  conditionId: string,
  clobApiUrl?: string
): Promise<MarketInfo | null> {
  logger.info(`[marketValidation] Fetching market info for ${conditionId}`);
  
  // Try gamma-api first
  const gammaMarket = await fetchMarketFromGammaApi(conditionId);
  if (gammaMarket) {
    logger.info(`[marketValidation] Found market info from gamma-api`);
    return gammaMarket;
  }
  
  // Try CLOB API as fallback
  const clobMarket = await fetchMarketFromClobApi(conditionId, clobApiUrl);
  if (clobMarket) {
    logger.info(`[marketValidation] Found market info from CLOB API`);
    return clobMarket;
  }
  
  logger.warn(`[marketValidation] Could not fetch market info for ${conditionId} from any source`);
  return null;
}

/**
 * Validate if a market should be redeemed
 */
export function validateMarketForRedemption(market: MarketInfo): {
  isValid: boolean;
  reason?: string;
} {
  // Check if market is too old (before June 2024)
  if (market.endDate) {
    const endDate = new Date(market.endDate);
    const cutoffDate = new Date('2024-06-01');
    
    if (endDate < cutoffDate) {
      return {
        isValid: false,
        reason: `Market ended before June 2024 (${market.endDate})`
      };
    }
    
    // Check if market ended at least 1 hour ago (to ensure resolution)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (endDate > oneHourAgo && !market.resolved) {
      return {
        isValid: false,
        reason: `Market ended less than 1 hour ago and not marked as resolved`
      };
    }
  }
  
  // Check if market is resolved or closed
  if (!market.closed && !market.resolved) {
    return {
      isValid: false,
      reason: `Market is not closed or resolved`
    };
  }
  
  // Check if we have a valid condition ID
  if (!market.conditionId || market.conditionId.length !== 66 || !market.conditionId.startsWith('0x')) {
    return {
      isValid: false,
      reason: `Invalid condition ID format: ${market.conditionId}`
    };
  }
  
  return { isValid: true };
}

/**
 * Batch validate multiple markets
 */
export async function validateMarketsForRedemption(
  markets: MarketInfo[]
): Promise<MarketInfo[]> {
  const validMarkets: MarketInfo[] = [];
  
  for (const market of markets) {
    const validation = validateMarketForRedemption(market);
    
    if (validation.isValid) {
      logger.info(`[marketValidation] Market ${market.conditionId} is valid for redemption`);
      validMarkets.push(market);
    } else {
      logger.warn(`[marketValidation] Market ${market.conditionId} is invalid: ${validation.reason}`);
    }
  }
  
  logger.info(`[marketValidation] ${validMarkets.length} out of ${markets.length} markets are valid for redemption`);
  return validMarkets;
}