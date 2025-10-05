import {
  type Action,
  type ActionResult,
  type Content,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from "@elizaos/core";
import { ethers, Wallet, Contract, JsonRpcProvider, parseUnits, ZeroHash } from "ethers";
import {
  contentToActionResult,
  createErrorResult,
} from "../utils/actionHelpers";
import {
  fetchPositionsWithFallback,
  isMarketEligibleForRedemption,
  checkOnChainResolution,
  type Position,
  type ResolvedMarket,
} from "../utils/positionFetcher";
import {
  fetchMarketInfoWithFallback,
  validateMarketForRedemption,
} from "../utils/marketValidation";

// Contract addresses
const CONDITIONAL_TOKENS_ADDRESS = "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045";
const NEG_RISK_ADAPTER_ADDRESS = "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296";
const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"; // USDC.e
const CTF_EXCHANGE_ADDRESS = "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E";

// ABI for ConditionalTokens
const CONDITIONAL_TOKENS_ABI = [
  "function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] calldata indexSets) external",
  "function payoutNumerators(bytes32 conditionId, uint256 index) external view returns (uint256)",
  "function payoutDenominator(bytes32 conditionId) external view returns (uint256)",
];

// ABI for NegRiskAdapter
const NEG_RISK_ADAPTER_ABI = [
  "function redeemPositions(bytes32 conditionId, uint256[] calldata amounts) external",
];

// ABI for CTF Exchange (to check if resolution was reported)
const CTF_EXCHANGE_ABI = [
  "function getCondition(bytes32 conditionId) external view returns (tuple(address oracle, bytes32 questionId, uint outcomeSlotCount, address resolved, uint256[] payouts))",
];

// Enhanced interface extending the imported one
interface EnhancedResolvedMarket extends ResolvedMarket {
  isResolvedOnChain?: boolean;
}

// checkOnChainResolution is now imported from positionFetcher utility

/**
 * Enhanced Redeem winnings from resolved markets
 */
export const redeemWinningsEnhancedAction: Action = {
  name: "REDEEM_WINNINGS_ENHANCED",
  similes: [
    "REDEEM_POSITIONS_ENHANCED",
    "CLAIM_WINNINGS_ENHANCED",
  ],
  description: "Enhanced redemption that checks on-chain resolution status first",
  
  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "redeem enhanced" },
      },
      {
        name: "{{assistant}}",
        content: { 
          text: "I'll check for resolved markets on-chain and redeem any winnings.",
          actions: ["REDEEM_WINNINGS_ENHANCED"],
        },
      },
    ],
  ],

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ): Promise<boolean> => {
    const text = (message.content.text || "").toLowerCase();
    
    if (!text.includes("enhanced") && !text.includes("redeem")) {
      return false;
    }
    
    const privateKey = runtime.getSetting("WALLET_PRIVATE_KEY") || 
                      runtime.getSetting("PRIVATE_KEY") ||
                      runtime.getSetting("POLYMARKET_PRIVATE_KEY");
    
    if (!privateKey) {
      logger.warn("[redeemWinningsEnhanced] No private key configured");
      return false;
    }
    
    return true;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    logger.info("[redeemWinningsEnhanced] Starting enhanced redemption process");

    try {
      const privateKey = runtime.getSetting("WALLET_PRIVATE_KEY") || 
                        runtime.getSetting("PRIVATE_KEY") ||
                        runtime.getSetting("POLYMARKET_PRIVATE_KEY");
      
      if (!privateKey) {
        throw new Error("No private key configured for redemption");
      }

      // Initialize provider and wallet
      const provider = new JsonRpcProvider("https://polygon-rpc.com");
      const wallet = new Wallet(privateKey, provider);
      const walletAddress = wallet.address;

      logger.info(`[redeemWinningsEnhanced] Using wallet: ${walletAddress}`);

      if (callback) {
        await callback({
          text: "🔍 **Checking for Resolved Markets (Enhanced)**\n\nSearching for positions with on-chain resolution...",
          actions: ["REDEEM_WINNINGS_ENHANCED"],
          data: { status: "checking" },
        });
      }

      // Get current positions using fallback chain
      logger.info(`[redeemWinningsEnhanced] Fetching positions for wallet: ${walletAddress}`);
      const positions = await fetchPositionsWithFallback(runtime, walletAddress);
      logger.info(`[redeemWinningsEnhanced] Found ${positions.length} positions`);

      // Check which markets are resolved ON-CHAIN
      const marketMap = new Map<string, EnhancedResolvedMarket>();
      const clobApiUrl = runtime.getSetting("CLOB_API_URL") || "https://clob.polymarket.com";
      
      for (const position of positions) {
        const size = parseFloat(position.size || "0");
        if (size < 0.01) {
          logger.info(`[redeemWinningsEnhanced] Skipping position with small size: ${size}`);
          continue;
        }

        const conditionId = position.conditionId;
        
        if (!conditionId) {
          logger.warn(`[redeemWinningsEnhanced] No condition ID for position`);
          continue;
        }

        // Check on-chain resolution status FIRST (most reliable)
        const isResolvedOnChain = await checkOnChainResolution(provider, conditionId);
        
        if (!isResolvedOnChain) {
          logger.info(`[redeemWinningsEnhanced] Market ${conditionId.substring(0, 10)}... not resolved on-chain`);
          continue;
        }
        
        logger.info(`[redeemWinningsEnhanced] Market ${conditionId.substring(0, 10)}... is RESOLVED on-chain!`);
        
        // Get market info for validation and details
        const marketInfo = await fetchMarketInfoWithFallback(conditionId, clobApiUrl);
        
        if (!marketInfo) {
          logger.warn(`[redeemWinningsEnhanced] Could not fetch market info for resolved market ${conditionId}`);
          // Still try to redeem with minimal info since it's resolved on-chain
        }
        
        const existingMarket = marketMap.get(conditionId);
        
        if (existingMarket) {
          existingMarket.positions?.push({
            tokenId: position.tokenId,
            outcome: position.outcome,
            size: position.size,
          });
        } else {
          marketMap.set(conditionId, {
            conditionId,
            question: marketInfo?.question || "Unknown market",
            isNegRisk: marketInfo?.negRisk || false,
            isResolvedOnChain: true,
            resolvedOutcome: marketInfo?.outcome,
            endDate: marketInfo?.endDate,
            closed: marketInfo?.closed,
            resolved: marketInfo?.resolved,
            positions: [{
              tokenId: position.tokenId,
              outcome: position.outcome,
              size: position.size,
            }],
          });
        }
      }
      
      const resolvedMarkets = Array.from(marketMap.values());

      if (resolvedMarkets.length === 0) {
        const responseContent: Content = {
          text: "📊 **No On-Chain Resolved Positions Found**\n\nNo positions are ready for redemption on-chain. Markets may be resolved off-chain but waiting for oracle report.",
          actions: ["REDEEM_WINNINGS_ENHANCED"],
          data: {
            status: "no_positions",
            checkedPositions: positions.length,
          },
        };

        if (callback) {
          await callback(responseContent);
        }

        return contentToActionResult(responseContent);
      }

      // Report found markets
      if (callback) {
        const marketsList = resolvedMarkets.map(m => 
          `• ${m.question.substring(0, 50)}...`
        ).join("\n");
        
        await callback({
          text: `✅ **Found ${resolvedMarkets.length} On-Chain Resolved Markets**\n\n${marketsList}\n\nPreparing redemption transactions...`,
          actions: ["REDEEM_WINNINGS_ENHANCED"],
          data: { 
            status: "preparing",
            resolvedMarkets: resolvedMarkets.length,
          },
        });
      }

      // Process redemptions
      const redemptionResults: Array<{
        market: string;
        txHash: string;
        status: string;
        type?: string;
        error?: string;
      }> = [];
      let totalRedeemed = 0;

      for (const market of resolvedMarkets) {
        try {
          logger.info(`[redeemWinningsEnhanced] Processing redemption for ${market.conditionId}`);

          if (market.isNegRisk) {
            // Use NegRiskAdapter for neg risk markets
            const negRiskAdapter = new Contract(
              NEG_RISK_ADAPTER_ADDRESS,
              NEG_RISK_ADAPTER_ABI,
              wallet
            );

            const amounts = market.positions?.map(p => 
              parseUnits(p.size, 6) // USDC has 6 decimals
            ) || [];

            if (amounts.length > 0) {
              const tx = await negRiskAdapter.redeemPositions(
                market.conditionId,
                amounts,
                {
                  gasLimit: 500000,
                }
              );

              logger.info(`[redeemWinningsEnhanced] Neg risk redemption tx: ${tx.hash}`);
              
              const receipt = await tx.wait();
              
              if (receipt && receipt.status === 1) {
                redemptionResults.push({
                  market: market.question,
                  txHash: tx.hash,
                  status: "success",
                  type: "neg_risk",
                });
                
                const estimatedAmount = market.positions?.reduce((sum, p) => 
                  sum + parseFloat(p.size), 0
                ) || 0;
                totalRedeemed += estimatedAmount;
              } else {
                redemptionResults.push({
                  market: market.question,
                  txHash: tx.hash,
                  status: "failed",
                  error: "Transaction reverted",
                });
              }
            }
          } else {
            // Standard ConditionalTokens redemption
            const conditionalTokens = new Contract(
              CONDITIONAL_TOKENS_ADDRESS,
              CONDITIONAL_TOKENS_ABI,
              wallet
            );

            const indexSets = [1, 2];
            const parentCollectionId = ZeroHash;

            const tx = await conditionalTokens["redeemPositions(address,bytes32,bytes32,uint256[])"](
              USDC_ADDRESS,
              parentCollectionId,
              market.conditionId,
              indexSets,
              {
                gasLimit: 500000,
              }
            );

            logger.info(`[redeemWinningsEnhanced] Standard redemption tx: ${tx.hash}`);
            
            const receipt = await tx.wait();
            
            if (receipt && receipt.status === 1) {
              redemptionResults.push({
                market: market.question,
                txHash: tx.hash,
                status: "success",
                type: "standard",
              });
              
              const estimatedAmount = market.positions?.reduce((sum, p) => 
                sum + parseFloat(p.size), 0
              ) || 0;
              totalRedeemed += estimatedAmount;
            } else {
              redemptionResults.push({
                market: market.question,
                txHash: tx.hash,
                status: "failed",
                error: "Transaction reverted",
              });
            }
          }

        } catch (error) {
          logger.error(`[redeemWinningsEnhanced] Failed to redeem ${market.conditionId}: ${error}`);
          
          redemptionResults.push({
            market: market.question,
            txHash: "",
            error: error instanceof Error ? error.message : "Unknown error",
            status: "failed",
          });
        }
      }

      // Prepare final response
      const successCount = redemptionResults.filter(r => r.status === "success").length;
      const failedCount = redemptionResults.filter(r => r.status === "failed").length;

      let responseText = `🎉 **Enhanced Redemption Complete**\n\n`;
      responseText += `✅ Successfully redeemed: ${successCount} market(s)\n`;
      if (failedCount > 0) {
        responseText += `❌ Failed redemptions: ${failedCount} market(s)\n`;
      }
      responseText += `💰 Estimated total redeemed: ~$${totalRedeemed.toFixed(2)} USDC\n\n`;

      if (redemptionResults.length > 0) {
        responseText += "**Transaction Details:**\n";
        for (const result of redemptionResults) {
          if (result.status === "success") {
            responseText += `✅ ${result.market.substring(0, 40)}...\n`;
            responseText += `   TX: ${result.txHash}\n`;
          } else {
            responseText += `❌ ${result.market.substring(0, 40)}...\n`;
            responseText += `   Error: ${result.error}\n`;
          }
        }
      }

      const responseContent: Content = {
        text: responseText,
        actions: ["REDEEM_WINNINGS_ENHANCED"],
        data: {
          status: "completed",
          successCount,
          failedCount,
          totalRedeemed,
          results: redemptionResults,
        },
      };

      if (callback) {
        await callback(responseContent);
      }

      return contentToActionResult(responseContent);

    } catch (error) {
      logger.error(`[redeemWinningsEnhanced] Error: ${error}`);
      
      const errorContent: Content = {
        text: `❌ **Enhanced Redemption Failed**\n\n${error instanceof Error ? error.message : "Unknown error occurred"}`,
        actions: ["REDEEM_WINNINGS_ENHANCED"],
        data: {
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };

      if (callback) {
        await callback(errorContent);
      }

      return createErrorResult(
        error instanceof Error ? error.message : "Enhanced redemption failed"
      );
    }
  },
};