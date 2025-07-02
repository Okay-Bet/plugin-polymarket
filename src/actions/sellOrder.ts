import {
    Action,
    elizaLogger,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from '@elizaos/core';
import { PolymarketService } from '../services/polymarketService';
import {
    SellOrderActionContent,
    SellOrderData,
    SellOrderParams,
    OrderType,
    OrderSide,
    OrderResponse
} from '../types';

export const sellOrder: Action = {
    name: 'SELL_POLYMARKET_ORDER',
    similes: [
        'PLACE_SELL_ORDER',
        'POLYMARKET_SELL',
        'CREATE_SELL_ORDER',
        'EXECUTE_SELL',
        'SELL_TOKENS',
        'CASH_OUT',
        'LIQUIDATE_POSITION'
    ],
    description: 'Place a sell order on Polymarket for prediction market tokens',
    
    validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<boolean> => {
        const messageText = message.content?.text?.toLowerCase() || '';
        
        // Check for sell-related keywords
        const sellKeywords = [
            'sell', 'liquidate', 'cash out', 'exit position', 'sell tokens',
            'place sell order', 'sell my position', 'exit trade', 'exit my trade'
        ];
        
        // Check for Polymarket-related keywords
        const polymarketKeywords = [
            'polymarket', 'prediction market', 'market',
            'outcome', 'token', 'odds', 'position'
        ];
        
        const hasSellKeyword = sellKeywords.some(keyword => 
            messageText.includes(keyword)
        );
        
        const hasPolymarketKeyword = polymarketKeywords.some(keyword => 
            messageText.includes(keyword)
        );
        
        return hasSellKeyword && hasPolymarketKeyword;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options: any = {},
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            elizaLogger.info('Processing sell order request');
            
            const messageText = message.content?.text || '';
            
            // Extract order parameters from the message
            const orderParams = extractSellOrderParams(messageText);
            
            if (!orderParams) {
                if (callback) {
                    await callback({
                        text: "I couldn't understand your sell order request. Please specify the token ID, price, and amount you want to sell.",
                        actions: ['SELL_POLYMARKET_ORDER'],
                        thought: 'User provided insufficient information for sell order'
                    });
                }
                return false;
            }

            // Get the Polymarket service
            const polymarketService = runtime.getService('polymarket') as PolymarketService;
            if (!polymarketService) {
                if (callback) {
                    await callback({
                        text: 'Polymarket service is not available. Please check the configuration.',
                        actions: ['SELL_POLYMARKET_ORDER'],
                        thought: 'Polymarket service not found'
                    });
                }
                return false;
            }

            // Validate the order parameters using the service
            const validation = await polymarketService.validateSellOrder(orderParams);
            if (!validation.valid) {
                let errorMessage = `Invalid sell order parameters: ${validation.errors.join(', ')}`;
                if (validation.warnings && validation.warnings.length > 0) {
                    errorMessage += `\nWarnings: ${validation.warnings.join(', ')}`;
                }
                if (callback) {
                    await callback({
                        text: errorMessage,
                        actions: ['SELL_POLYMARKET_ORDER'],
                        thought: 'Sell order validation failed'
                    });
                }
                return false;
            }

            // Show warnings if any
            if (validation.warnings && validation.warnings.length > 0) {
                elizaLogger.warn('Sell order validation warnings:', validation.warnings);
            }

            // Place the sell order
            const response = await polymarketService.placeSellOrder(orderParams);

            if (response.success) {
                if (callback) {
                    await callback({
                        text: formatSellSuccessResponse(response),
                        actions: ['SELL_POLYMARKET_ORDER'],
                        thought: 'Sell order placed successfully'
                    });
                }
                return true;
            } else {
                if (callback) {
                    await callback({
                        text: `Failed to place sell order: ${response.error}`,
                        actions: ['SELL_POLYMARKET_ORDER'],
                        thought: 'Sell order failed'
                    });
                }
                return false;
            }
            
        } catch (error) {
            elizaLogger.error('Error in sell order handler:', error);
            if (callback) {
                await callback({
                    text: `Sorry, there was an error processing your sell order: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    actions: ['SELL_POLYMARKET_ORDER'],
                    thought: 'Error occurred while processing sell order'
                });
            }
            return false;
        }
    }
};

function extractSellOrderParams(messageText: string): SellOrderParams | null {
    // Simple regex patterns to extract sell order parameters
    const tokenIdMatch = messageText.match(/token\s+(?:id\s+)?([a-zA-Z0-9-_]+)/i);
    const priceMatch = messageText.match(/(?:at\s+)?\$?([0-9]+\.?[0-9]*)/);
    const sizeMatch = messageText.match(/([0-9]+)\s+tokens?/i);
    
    if (!tokenIdMatch || !priceMatch || !sizeMatch) {
        return null;
    }
    
    return {
        tokenId: tokenIdMatch[1],
        price: parseFloat(priceMatch[1]),
        size: parseInt(sizeMatch[1]),
        orderType: OrderType.GTC
    };
}

function formatSellSuccessResponse(response: OrderResponse): string {
    const details = response.details!;
    return `Successfully placed sell order!
📊 Order Details:
- Token ID: ${details.tokenId}
- Price: $${details.price.toFixed(2)} per token
- Size: ${details.size} tokens
- Total Value: $${(details.price * details.size).toFixed(2)}
- Order Type: ${details.orderType}
- Status: ${details.status}
- Order ID: ${response.orderId}

⚠️ Note: This is currently a simulation. Real order placement requires wallet configuration.`;
}