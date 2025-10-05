import { type IAgentRuntime, logger } from "@elizaos/core";
import { initializeClobClient } from "./clobClient";
import { ethers } from "ethers";

export interface Position {
  conditionId: string;
  marketId?: string;
  tokenId: string;
  outcome: string;
  size: string;
  currentPrice?: number;
  market?: {
    question?: string;
    conditionId?: string;
    endDate?: string;
    closed?: boolean;
    resolved?: boolean;
    negRisk?: boolean;
  };
}

export interface ResolvedMarket {
  conditionId: string;
  question: string;
  resolvedOutcome?: string;
  isNegRisk?: boolean;
  endDate?: string;
  closed?: boolean;
  resolved?: boolean;
  positions?: {
    tokenId: string;
    outcome: string;
    size: string;
  }[];
}

/**
 * Fetch positions using CLOB client (most reliable)
 */
async function fetchPositionsFromClobClient(
  runtime: IAgentRuntime,
  walletAddress: string
): Promise<Position[]> {
  try {
    logger.info(`[positionFetcher] Attempting to fetch positions from CLOB client for ${walletAddress}`);
    
    const client = await initializeClobClient(runtime);
    
    // Get open orders which might have associated positions
    const orders = await client.getOrders({
      maker: walletAddress.toLowerCase(),
      state: "MATCHED"
    });
    
    // Get balances/positions via the client
    const balances = await client.getBalances();
    
    logger.info(`[positionFetcher] CLOB client returned ${orders?.length || 0} orders and balances data`);
    
    // Convert balances to positions format
    const positions: Position[] = [];
    
    if (balances && typeof balances === 'object') {
      for (const [tokenId, balance] of Object.entries(balances)) {
        if (balance && parseFloat(balance as string) > 0.01) {
          positions.push({
            conditionId: '', // Will need to fetch from market data
            tokenId,
            outcome: '', // Will need to fetch from market data
            size: balance as string,
          });
        }
      }
    }
    
    logger.info(`[positionFetcher] Found ${positions.length} positions from CLOB client`);
    return positions;
  } catch (error) {
    logger.error(`[positionFetcher] Failed to fetch from CLOB client: ${error}`);
    throw error;
  }
}

/**
 * Fetch positions from gamma-api.polymarket.com
 */
async function fetchPositionsFromGammaApi(
  walletAddress: string
): Promise<Position[]> {
  try {
    const url = `https://gamma-api.polymarket.com/users/${walletAddress}/positions`;
    logger.info(`[positionFetcher] Attempting to fetch positions from gamma-api: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Gamma API returned ${response.status}`);
    }
    
    const data = await response.json();
    const positions = data.positions || data || [];
    
    logger.info(`[positionFetcher] Gamma API returned ${positions.length} positions`);
    
    // Map to standard position format
    return positions.map((p: any) => ({
      conditionId: p.conditionId || p.condition_id,
      marketId: p.marketId || p.market_id,
      tokenId: p.tokenId || p.token_id,
      outcome: p.outcome,
      size: p.size || p.quantity || p.amount,
      currentPrice: p.currentPrice || p.current_price || p.price,
      market: {
        question: p.question || p.market?.question,
        conditionId: p.conditionId || p.market?.conditionId,
        endDate: p.endDate || p.market?.endDate,
        closed: p.closed || p.market?.closed,
        resolved: p.resolved || p.market?.resolved,
        negRisk: p.negRisk || p.market?.negRisk,
      }
    }));
  } catch (error) {
    logger.error(`[positionFetcher] Failed to fetch from gamma-api: ${error}`);
    throw error;
  }
}

/**
 * Fetch positions from data-api.polymarket.com (least reliable, often stale)
 */
async function fetchPositionsFromDataApi(
  walletAddress: string
): Promise<Position[]> {
  try {
    const url = `https://data-api.polymarket.com/positions?user=${walletAddress}&sizeThreshold=0.01`;
    logger.info(`[positionFetcher] Attempting to fetch positions from data-api: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Data API returned ${response.status}`);
    }
    
    const data = await response.json();
    const positions = data.data || data || [];
    
    logger.info(`[positionFetcher] Data API returned ${positions.length} positions`);
    
    // Filter out old positions (before June 2024)
    const recentPositions = positions.filter((p: any) => {
      const marketEndDate = p.market?.endDate || p.endDate || p.end_date_iso;
      if (marketEndDate) {
        const endDate = new Date(marketEndDate);
        return endDate > new Date('2024-06-01');
      }
      return true; // Include if no date info
    });
    
    logger.info(`[positionFetcher] Filtered to ${recentPositions.length} recent positions`);
    
    // Map to standard position format
    return recentPositions.map((p: any) => ({
      conditionId: p.conditionId || p.market?.conditionId || p.condition_id,
      marketId: p.marketId || p.market_id,
      tokenId: p.tokenId || p.token_id,
      outcome: p.outcome,
      size: p.size || p.quantity || p.amount,
      currentPrice: parseFloat(p.currentPrice || p.price || p.current_price || "-1"),
      market: {
        question: p.question || p.market?.question,
        conditionId: p.conditionId || p.market?.conditionId,
        endDate: p.endDate || p.market?.endDate || p.end_date_iso,
        closed: p.closed || p.market?.closed,
        resolved: p.resolved || p.market?.resolved,
        negRisk: p.negRisk || p.market?.negRisk || p.negative_risk,
      }
    }));
  } catch (error) {
    logger.error(`[positionFetcher] Failed to fetch from data-api: ${error}`);
    throw error;
  }
}

/**
 * Fetch positions with fallback chain
 */
export async function fetchPositionsWithFallback(
  runtime: IAgentRuntime,
  walletAddress: string
): Promise<Position[]> {
  logger.info(`[positionFetcher] Starting position fetch for wallet ${walletAddress}`);
  
  // Try each source in order
  const sources = [
    { name: 'CLOB Client', fn: () => fetchPositionsFromClobClient(runtime, walletAddress) },
    { name: 'Gamma API', fn: () => fetchPositionsFromGammaApi(walletAddress) },
    { name: 'Data API', fn: () => fetchPositionsFromDataApi(walletAddress) },
  ];
  
  let lastError: Error | null = null;
  
  for (const source of sources) {
    try {
      logger.info(`[positionFetcher] Trying ${source.name}...`);
      const positions = await source.fn();
      
      if (positions && positions.length > 0) {
        logger.info(`[positionFetcher] Successfully fetched ${positions.length} positions from ${source.name}`);
        return positions;
      } else {
        logger.warn(`[positionFetcher] ${source.name} returned no positions`);
      }
    } catch (error) {
      logger.warn(`[positionFetcher] ${source.name} failed: ${error}`);
      lastError = error as Error;
      // Continue to next source
    }
  }
  
  // If all sources failed, return empty array (no positions)
  logger.warn(`[positionFetcher] All sources failed. Assuming no positions.`);
  return [];
}

/**
 * Validate if a market is eligible for redemption
 */
export function isMarketEligibleForRedemption(market: ResolvedMarket): boolean {
  // Check if market is too old (before June 2024)
  if (market.endDate) {
    const endDate = new Date(market.endDate);
    if (endDate < new Date('2024-06-01')) {
      logger.info(`[positionFetcher] Market ${market.conditionId} is too old (ended ${market.endDate})`);
      return false;
    }
  }
  
  // Check if market is resolved or closed
  if (!market.closed && !market.resolved) {
    // Also check if any position has price of 0 or 1 (indicates resolution)
    const hasResolvedPrice = market.positions?.some(p => {
      const price = parseFloat((p as any).currentPrice || "-1");
      return price === 0 || price === 1;
    });
    
    if (!hasResolvedPrice) {
      logger.info(`[positionFetcher] Market ${market.conditionId} is not resolved`);
      return false;
    }
  }
  
  // Check if positions exist and have size
  if (!market.positions || market.positions.length === 0) {
    logger.info(`[positionFetcher] Market ${market.conditionId} has no positions`);
    return false;
  }
  
  const totalSize = market.positions.reduce((sum, p) => sum + parseFloat(p.size || "0"), 0);
  if (totalSize < 0.01) {
    logger.info(`[positionFetcher] Market ${market.conditionId} position size too small: ${totalSize}`);
    return false;
  }
  
  return true;
}

/**
 * Check on-chain if a market has been resolved
 */
export async function checkOnChainResolution(
  provider: ethers.JsonRpcProvider,
  conditionId: string
): Promise<boolean> {
  try {
    const CONDITIONAL_TOKENS_ADDRESS = "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045";
    const CONDITIONAL_TOKENS_ABI = [
      "function payoutDenominator(bytes32 conditionId) external view returns (uint256)",
    ];
    
    const contract = new ethers.Contract(
      CONDITIONAL_TOKENS_ADDRESS,
      CONDITIONAL_TOKENS_ABI,
      provider
    );
    
    const payoutDenominator = await contract.payoutDenominator(conditionId);
    
    // If payoutDenominator > 0, the market has been resolved
    const isResolved = payoutDenominator > 0n;
    
    logger.info(`[positionFetcher] On-chain check for ${conditionId}: payoutDenominator=${payoutDenominator}, resolved=${isResolved}`);
    
    return isResolved;
  } catch (error) {
    logger.error(`[positionFetcher] Failed to check on-chain resolution for ${conditionId}: ${error}`);
    return false;
  }
}