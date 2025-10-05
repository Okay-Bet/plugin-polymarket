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
import { initializeClobClient } from "../utils/clobClient";
import {
  contentToActionResult,
  createErrorResult,
} from "../utils/actionHelpers";
import {
  fetchPositionsWithFallback,
  isMarketEligibleForRedemption,
  checkOnChainResolution,
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

// ABI for ConditionalTokens redeemPositions function
const CONDITIONAL_TOKENS_ABI = [
  "function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] calldata indexSets) external",
  "function payoutNumerators(bytes32 conditionId, uint256 index) external view returns (uint256)",
  "function payoutDenominator(bytes32 conditionId) external view returns (uint256)",
];

// ABI for NegRiskAdapter redeemPositions function
const NEG_RISK_ADAPTER_ABI = [
  "function redeemPositions(bytes32 conditionId, uint256[] calldata amounts) external",
];

// ResolvedMarket interface is now imported from positionFetcher

/**
 * Redeem winnings from resolved markets
 */
export const redeemWinningsAction: Action = {
  name: "REDEEM_WINNINGS",
  similes: [
    "REDEEM_POSITIONS",
    "CLAIM_WINNINGS",
    "COLLECT_WINNINGS",
    "REDEEM",
    "CLAIM",
    "WITHDRAW_WINNINGS",
    "GET_PAYOUTS",
  ],
  description: "Redeem winnings from resolved Polymarket markets",
  
  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "redeem my winnings" },
      },
      {
        name: "{{assistant}}",
        content: { 
          text: "I'll check for resolved markets and redeem any winnings.",
          actions: ["REDEEM_WINNINGS"],
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "claim all resolved positions" },
      },
      {
        name: "{{assistant}}",
        content: { 
          text: "Let me process redemptions for all your resolved markets.",
          actions: ["REDEEM_WINNINGS"],
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
    
    // Check for redemption-related keywords
    const redeemKeywords = ["redeem", "claim", "collect", "withdraw"];
    const contextKeywords = ["winning", "payout", "position", "resolved", "settlement"];
    
    const hasRedeemKeyword = redeemKeywords.some(keyword => text.includes(keyword));
    const hasContextKeyword = contextKeywords.some(keyword => text.includes(keyword));
    
    // Must have a redeem keyword, optionally with context
    if (!hasRedeemKeyword && !(text.includes("get") && hasContextKeyword)) {
      return false;
    }
    
    // Check for private key
    const privateKey = runtime.getSetting("WALLET_PRIVATE_KEY") || 
                      runtime.getSetting("PRIVATE_KEY") ||
                      runtime.getSetting("POLYMARKET_PRIVATE_KEY");
    
    if (!privateKey) {
      logger.warn("[redeemWinningsAction] No private key configured");
      return false;
    }
    
    logger.info(`[redeemWinningsAction] Validation passed for message: "${text}"`);
    return true;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    logger.info("[redeemWinningsAction] Starting redemption process");

    try {
      // Get private key and setup provider
      const privateKey = runtime.getSetting("WALLET_PRIVATE_KEY") || 
                        runtime.getSetting("PRIVATE_KEY") ||
                        runtime.getSetting("POLYMARKET_PRIVATE_KEY");
      
      if (!privateKey) {
        throw new Error("No private key configured for redemption");
      }

      // Initialize provider and wallet
      const provider = new JsonRpcProvider(
        "https://polygon-rpc.com"
      );
      const wallet = new Wallet(privateKey, provider);
      const walletAddress = wallet.address;

      logger.info(`[redeemWinnings] Using wallet: ${walletAddress}`);

      if (callback) {
        await callback({
          text: "🔍 **Checking for Resolved Markets**\n\nSearching for positions that can be redeemed...",
          actions: ["REDEEM_WINNINGS"],
          data: { status: "checking" },
        });
      }

      // Get current positions using fallback chain
      logger.info(`[redeemWinnings] Fetching positions for wallet: ${walletAddress}`);
      const positions = await fetchPositionsWithFallback(runtime, walletAddress);
      logger.info(`[redeemWinnings] Found ${positions.length} positions`);

      // Check which markets are resolved
      const marketMap = new Map<string, ResolvedMarket>();
      const clobApiUrl = runtime.getSetting("CLOB_API_URL") || "https://clob.polymarket.com";
      
      for (const position of positions) {
        // Skip if position is too small
        const size = parseFloat(position.size || "0");
        if (size < 0.01) {
          logger.info(`[redeemWinnings] Skipping position with small size: ${size}`);
          continue;
        }

        const conditionId = position.conditionId;
        
        if (!conditionId) {
          logger.warn(`[redeemWinnings] No condition ID for position: ${JSON.stringify(position).substring(0, 200)}`);
          continue;
        }

        logger.info(`[redeemWinnings] Checking position ${position.outcome} in market ${conditionId?.substring(0, 10)}... with size ${size}`);

        // Get market info with fallback chain
        const marketInfo = await fetchMarketInfoWithFallback(conditionId, clobApiUrl);
        
        if (!marketInfo) {
          logger.warn(`[redeemWinnings] Could not fetch market info for ${conditionId}`);
          continue;
        }
        
        // Validate market for redemption
        const validation = validateMarketForRedemption(marketInfo);
        
        if (!validation.isValid) {
          logger.info(`[redeemWinnings] Market ${conditionId} not eligible: ${validation.reason}`);
          continue;
        }
        
        // Check on-chain resolution status
        const isResolvedOnChain = await checkOnChainResolution(provider, conditionId);
        
        if (!isResolvedOnChain) {
          logger.info(`[redeemWinnings] Market ${conditionId} not resolved on-chain yet`);
          continue;
        }
        
        // Market is valid for redemption
        const existingMarket = marketMap.get(conditionId);
        
        if (existingMarket) {
          // Add this position to existing market entry
          existingMarket.positions?.push({
            tokenId: position.tokenId,
            outcome: position.outcome,
            size: position.size,
          });
        } else {
          // Create new market entry
          marketMap.set(conditionId, {
            conditionId,
            question: marketInfo.question || "Unknown market",
            resolvedOutcome: marketInfo.outcome,
            isNegRisk: marketInfo.negRisk,
            endDate: marketInfo.endDate,
            closed: marketInfo.closed,
            resolved: marketInfo.resolved,
            positions: [{
              tokenId: position.tokenId,
              outcome: position.outcome,
              size: position.size,
            }],
          });
        }
        
        logger.info(`[redeemWinnings] Found redeemable market: ${marketInfo.question?.substring(0, 50)}...`);
      }
      
      // Convert map to array and do final validation
      const allMarkets = Array.from(marketMap.values());
      const resolvedMarkets = allMarkets.filter(market => isMarketEligibleForRedemption(market));
      
      logger.info(`[redeemWinnings] ${resolvedMarkets.length} markets eligible for redemption out of ${allMarkets.length} resolved markets`);

      if (resolvedMarkets.length === 0) {
        const responseContent: Content = {
          text: "📊 **No Redeemable Positions Found**\n\nYou don't have any positions in resolved markets that can be redeemed.",
          actions: ["REDEEM_WINNINGS"],
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
          text: `✅ **Found ${resolvedMarkets.length} Resolved Markets**\n\n${marketsList}\n\nPreparing redemption transactions...`,
          actions: ["REDEEM_WINNINGS"],
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
          logger.info(`[redeemWinnings] Processing redemption for ${market.conditionId}`);

          if (market.isNegRisk) {
            // Use NegRiskAdapter for neg risk markets
            const negRiskAdapter = new Contract(
              NEG_RISK_ADAPTER_ADDRESS,
              NEG_RISK_ADAPTER_ABI,
              wallet
            );

            // Get position amounts for this market
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

              logger.info(`[redeemWinnings] Neg risk redemption tx: ${tx.hash}`);
              
              const receipt = await tx.wait();
              
              // Check if transaction was successful
              if (receipt && receipt.status === 1) {
                logger.info(`[redeemWinnings] Neg risk transaction confirmed successfully: ${tx.hash}`);
                redemptionResults.push({
                  market: market.question,
                  txHash: tx.hash,
                  status: "success",
                  type: "neg_risk",
                });
              } else {
                logger.error(`[redeemWinnings] Neg risk transaction failed: ${tx.hash}`);
                redemptionResults.push({
                  market: market.question,
                  txHash: tx.hash,
                  status: "failed",
                  error: "Transaction reverted on chain",
                });
              }

              // Only add to total if successful
              if (receipt && receipt.status === 1) {
                const estimatedAmount = market.positions?.reduce((sum, p) => 
                  sum + parseFloat(p.size), 0
                ) || 0;
                totalRedeemed += estimatedAmount;
              }
            }
          } else {
            // Use standard ConditionalTokens redemption
            const conditionalTokens = new Contract(
              CONDITIONAL_TOKENS_ADDRESS,
              CONDITIONAL_TOKENS_ABI,
              wallet
            );

            // For standard binary markets, indexSets is [1, 2] for both outcomes
            const indexSets = [1, 2];
            const parentCollectionId = ZeroHash; // 0x0 for top-level positions

            // Properly call the function with await
            const tx = await conditionalTokens["redeemPositions(address,bytes32,bytes32,uint256[])"](
              USDC_ADDRESS,
              parentCollectionId,
              market.conditionId,
              indexSets,
              {
                gasLimit: 500000,
              }
            );

            logger.info(`[redeemWinnings] Standard redemption tx: ${tx.hash}`);
            
            const receipt = await tx.wait();
            
            // Check if transaction was successful
            if (receipt && receipt.status === 1) {
              logger.info(`[redeemWinnings] Transaction confirmed successfully: ${tx.hash}`);
              redemptionResults.push({
                market: market.question,
                txHash: tx.hash,
                status: "success",
                type: "standard",
              });
            } else {
              logger.error(`[redeemWinnings] Transaction failed: ${tx.hash}`);
              redemptionResults.push({
                market: market.question,
                txHash: tx.hash,
                status: "failed",
                error: "Transaction reverted on chain",
              });
            }

            // Only add to total if successful
            if (receipt && receipt.status === 1) {
              const estimatedAmount = market.positions?.reduce((sum, p) => 
                sum + parseFloat(p.size), 0
              ) || 0;
              totalRedeemed += estimatedAmount;
            }
          }

        } catch (error) {
          logger.error(`[redeemWinnings] Failed to redeem ${market.conditionId}: ${error}`);
          
          redemptionResults.push({
            market: market.question,
            txHash: "", // No tx hash for failed redemption
            error: error instanceof Error ? error.message : "Unknown error",
            status: "failed",
          });
        }
      }

      // Prepare final response
      const successCount = redemptionResults.filter(r => r.status === "success").length;
      const failedCount = redemptionResults.filter(r => r.status === "failed").length;

      let responseText = `🎉 **Redemption Complete**\n\n`;
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
        actions: ["REDEEM_WINNINGS"],
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
      logger.error(`[redeemWinningsAction] Error: ${error}`);
      
      const errorContent: Content = {
        text: `❌ **Redemption Failed**\n\n${error instanceof Error ? error.message : "Unknown error occurred"}`,
        actions: ["REDEEM_WINNINGS"],
        data: {
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };

      if (callback) {
        await callback(errorContent);
      }

      return createErrorResult(
        error instanceof Error ? error.message : "Redemption failed"
      );
    }
  },
};