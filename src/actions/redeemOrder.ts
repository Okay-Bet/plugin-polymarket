import {
    Action,
    elizaLogger,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from '@elizaos/core';
import { PolymarketService } from '../services/polymarketService.js';
import {
    RedeemOrderActionContent,
    RedeemOrderData,
    RedeemParams,
    RedeemablePosition,
    RedeemResponse
} from '../types.js';

export const redeemOrder: Action = {
    name: 'REDEEM_POLYMARKET_POSITIONS',
    similes: [
        'CLAIM_WINNINGS',
        'POLYMARKET_REDEEM',
        'CASH_OUT_WINNINGS',
        'CLAIM_PAYOUT',
        'REDEEM_TOKENS',
        'COLLECT_WINNINGS',
        'WITHDRAW_WINNINGS'
    ],
    description: 'Redeem winning positions from resolved Polymarket prediction markets to claim USDC payouts',
    
    validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<boolean> => {
        const messageText = message.content?.text?.toLowerCase() || '';
        
        // Check for redeem-related keywords
        const redeemKeywords = [
            'redeem', 'claim winnings', 'cash out winnings', 'claim payout',
            'collect winnings', 'withdraw winnings', 'claim rewards',
            'redeem my positions', 'claim my winnings', 'cash out my wins',
            'claim', 'cash out', 'collect', 'withdraw'
        ];
        
        // Check for Polymarket-related keywords
        const polymarketKeywords = [
            'polymarket', 'prediction market', 'market',
            'outcome', 'position', 'winnings', 'resolved market'
        ];
        
        const hasRedeemKeyword = redeemKeywords.some(keyword => 
            messageText.includes(keyword)
        );
        
        const hasPolymarketKeyword = polymarketKeywords.some(keyword => 
            messageText.includes(keyword)
        );
        
        return hasRedeemKeyword && hasPolymarketKeyword;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options: any = {},
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            elizaLogger.info('Processing redeem positions request');
            
            const messageText = message.content?.text || '';
            
            // Get the Polymarket service
            const polymarketService = runtime.getService('polymarket') as PolymarketService;
            if (!polymarketService) {
                if (callback) {
                    await callback({
                        text: 'Polymarket service is not available. Please check the configuration.',
                        actions: ['REDEEM_POLYMARKET_POSITIONS'],
                        thought: 'Polymarket service not found'
                    });
                }
                return false;
            }

            // Check wallet configuration first
            if (!polymarketService.isWalletConfigured()) {
                if (callback) {
                    await callback({
                        text: 'Wallet configuration is required for redeeming positions. Please configure your Polygon private key or Polymarket API credentials.',
                        actions: ['REDEEM_POLYMARKET_POSITIONS'],
                        thought: 'Wallet not configured for redemption'
                    });
                }
                return false;
            }

            // Extract redeem parameters from the message
            const redeemParams = extractRedeemParams(messageText);
            
            // If no specific positions mentioned, get all redeemable positions
            if (!redeemParams) {
                elizaLogger.info('No specific positions mentioned, fetching all redeemable positions');
                
                try {
                    const redeemablePositions = await polymarketService.getRedeemablePositions();
                    
                    if (redeemablePositions.length === 0) {
                        if (callback) {
                            await callback({
                                text: 'No redeemable positions found. You may not have any winning positions in resolved markets, or markets may not be settled yet.',
                                actions: ['REDEEM_POLYMARKET_POSITIONS'],
                                thought: 'No redeemable positions available'
                            });
                        }
                        return false;
                    }

                    // Show available positions and ask for confirmation
                    if (callback) {
                        await callback({
                            text: formatRedeemablePositions(redeemablePositions),
                            actions: ['REDEEM_POLYMARKET_POSITIONS'],
                            thought: 'Showing available redeemable positions'
                        });
                    }
                    return true;

                } catch (error) {
                    if (callback) {
                        await callback({
                            text: `Error fetching redeemable positions: ${error instanceof Error ? error.message : 'Unknown error'}`,
                            actions: ['REDEEM_POLYMARKET_POSITIONS'],
                            thought: 'Error fetching redeemable positions'
                        });
                    }
                    return false;
                }
            }

            // If positions array is empty (e.g., "redeem all"), fetch redeemable positions first
            if (redeemParams.positions.length === 0) {
                try {
                    const redeemablePositions = await polymarketService.getRedeemablePositions();
                    redeemParams.positions = redeemablePositions;
                    
                    if (redeemablePositions.length === 0) {
                        if (callback) {
                            await callback({
                                text: 'No redeemable positions found. You may not have any winning positions in resolved markets, or markets may not be settled yet.',
                                actions: ['REDEEM_POLYMARKET_POSITIONS'],
                                thought: 'No redeemable positions available'
                            });
                        }
                        return false;
                    }
                } catch (error) {
                    if (callback) {
                        await callback({
                            text: `Error fetching redeemable positions: ${error instanceof Error ? error.message : 'Unknown error'}`,
                            actions: ['REDEEM_POLYMARKET_POSITIONS'],
                            thought: 'Error fetching redeemable positions'
                        });
                    }
                    return false;
                }
            }

            // Validate the redeem parameters using the service
            const validation = await polymarketService.validateRedeemPositions(redeemParams);
            if (!validation.valid) {
                let errorMessage = `Invalid redeem parameters: ${validation.errors.join(', ')}`;
                if (validation.warnings && validation.warnings.length > 0) {
                    errorMessage += `\nWarnings: ${validation.warnings.join(', ')}`;
                }
                if (callback) {
                    await callback({
                        text: errorMessage,
                        actions: ['REDEEM_POLYMARKET_POSITIONS'],
                        thought: 'Redeem validation failed'
                    });
                }
                return false;
            }

            // Show warnings if any
            if (validation.warnings && validation.warnings.length > 0) {
                elizaLogger.warn('Redeem validation warnings:', validation.warnings);
            }

            // Execute the redemption
            const response = await polymarketService.redeemPositions(redeemParams);

            if (response.success) {
                if (callback) {
                    await callback({
                        text: formatRedeemSuccessResponse(response),
                        actions: ['REDEEM_POLYMARKET_POSITIONS'],
                        thought: 'Positions redeemed successfully'
                    });
                }
                return true;
            } else {
                if (callback) {
                    await callback({
                        text: `Failed to redeem positions: ${response.error}`,
                        actions: ['REDEEM_POLYMARKET_POSITIONS'],
                        thought: 'Redemption failed'
                    });
                }
                return false;
            }
            
        } catch (error) {
            elizaLogger.error('Error in redeem positions handler:', error);
            if (callback) {
                await callback({
                    text: `Sorry, there was an error processing your redemption request: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    actions: ['REDEEM_POLYMARKET_POSITIONS'],
                    thought: 'Error occurred while processing redemption'
                });
            }
            return false;
        }
    }
};

function extractRedeemParams(messageText: string): RedeemParams | null {
    // Look for specific token IDs or market references
    const tokenIdMatch = messageText.match(/token\s+(?:id\s+)?([a-zA-Z0-9-_]+)/i);
    const marketIdMatch = messageText.match(/market\s+(?:id\s+)?([a-zA-Z0-9-_]+)/i);
    const allPositionsMatch = messageText.match(/all\s+.*?(?:positions|winnings|rewards)/i);
    const batchMatch = messageText.match(/batch|all\s+at\s+once/i);
    
    // Check if this is a redemption request vs just showing positions
    const redeemActionMatch = messageText.match(/redeem|claim|cash\s+out|collect|withdraw/i);
    
    // If user wants to redeem all positions (not just view them)
    if (allPositionsMatch && redeemActionMatch) {
        return {
            positions: [], // Will be populated by service
            batchRedeem: !!batchMatch
        };
    }
    
    // If specific token or market mentioned with redeem action
    if ((tokenIdMatch || marketIdMatch) && redeemActionMatch) {
        return {
            positions: [], // Will be validated by service
            batchRedeem: !!batchMatch
        };
    }
    
    // Check for other redeem-related phrases
    if (redeemActionMatch && messageText.includes('polymarket')) {
        return {
            positions: [], // Will be populated by service
            batchRedeem: !!batchMatch
        };
    }
    
    // Default case - let service fetch all redeemable positions for display
    return null;
}

function formatRedeemablePositions(positions: RedeemablePosition[]): string {
    let response = `Found ${positions.length} redeemable position${positions.length === 1 ? '' : 's'}:\n\n`;
    
    let totalPayout = 0;
    positions.forEach((position, index) => {
        response += `${index + 1}. **${position.marketQuestion}**\n`;
        response += `   - Winning Outcome: ${position.winningOutcome}\n`;
        response += `   - Your Tokens: ${position.amount}\n`;
        response += `   - Estimated Payout: $${position.estimatedPayout.toFixed(2)} USDC\n`;
        response += `   - Status: ${position.marketResolved && position.payoutsReported ? '✅ Ready to redeem' : '⏳ Pending settlement'}\n\n`;
        
        if (position.marketResolved && position.payoutsReported) {
            totalPayout += position.estimatedPayout;
        }
    });
    
    if (totalPayout > 0) {
        response += `**Total Available for Redemption: $${totalPayout.toFixed(2)} USDC**\n\n`;
        response += `To redeem these positions, say "redeem all my positions on Polymarket" or specify individual positions.`;
    } else {
        response += `⚠️ No positions are currently ready for redemption. Markets may still be settling.`;
    }
    
    return response;
}

function formatRedeemSuccessResponse(response: RedeemResponse): string {
    const details = response.details!;
    let result = `✅ Successfully redeemed ${details.redeemedPositions.length} position${details.redeemedPositions.length === 1 ? '' : 's'}!\n\n`;
    
    result += `💰 **Total Payout: $${details.totalPayout.toFixed(2)} USDC**\n\n`;
    
    result += `📊 **Redeemed Positions:**\n`;
    details.redeemedPositions.forEach((position, index) => {
        result += `${index + 1}. Token ${position.tokenId}: ${position.amount} tokens → $${position.payout.toFixed(2)} USDC\n`;
    });
    
    result += `\n🔗 **Transaction Hash:** ${response.transactionHash}\n`;
    
    if (details.gasUsed) {
        result += `⛽ **Gas Used:** ${details.gasUsed}\n`;
    }
    
    result += `\n✨ **Status:** ${details.status}\n`;
    result += `\n💡 The USDC has been transferred to your wallet address.`;
    
    return result;
}