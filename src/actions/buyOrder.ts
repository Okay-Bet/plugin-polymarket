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
    BuyOrderActionContent,
    BuyOrderData,
    BuyOrderParams,
    OrderType,
    OrderSide,
    OrderResponse
} from '../types.js';

export const buyOrder: Action = {
    name: 'BUY_POLYMARKET_ORDER',
    similes: [
        'PLACE_BUY_ORDER',
        'POLYMARKET_BUY',
        'CREATE_BUY_ORDER',
        'EXECUTE_BUY',
        'PURCHASE_TOKENS'
    ],
    description: 'Place a buy order on Polymarket for prediction market tokens',
    
    validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<boolean> => {
        const messageText = message.content?.text?.toLowerCase() || '';
        
        // Check for buy-related keywords
        const buyKeywords = [
            'buy', 'purchase', 'order', 'bet on', 'invest in',
            'place order', 'buy tokens', 'get position'
        ];
        
        // Check for Polymarket-related keywords
        const polymarketKeywords = [
            'polymarket', 'prediction market', 'market',
            'outcome', 'token', 'odds'
        ];
        
        const hasBuyKeyword = buyKeywords.some(keyword => 
            messageText.includes(keyword)
        );
        
        const hasPolymarketKeyword = polymarketKeywords.some(keyword => 
            messageText.includes(keyword)
        );
        
        return hasBuyKeyword && hasPolymarketKeyword;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options: any = {},
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            elizaLogger.info('Processing buy order request');
            
            const messageText = message.content?.text || '';
            
            // Extract order parameters from the message
            const orderParams = extractOrderParams(messageText);
            
            if (!orderParams) {
                if (callback) {
                    await callback({
                        text: "I couldn't understand your buy order request. Please specify the token ID, price, and amount you want to buy.",
                        actions: ['BUY_POLYMARKET_ORDER'],
                        thought: 'User provided insufficient information for buy order'
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
                        actions: ['BUY_POLYMARKET_ORDER'],
                        thought: 'Polymarket service not found'
                    });
                }
                return false;
            }

            // Validate the order parameters using the service
            const validation = await polymarketService.validateOrder(orderParams);
            if (!validation.valid) {
                let errorMessage = `Invalid order parameters: ${validation.errors.join(', ')}`;
                if (validation.warnings && validation.warnings.length > 0) {
                    errorMessage += `\nWarnings: ${validation.warnings.join(', ')}`;
                }
                if (callback) {
                    await callback({
                        text: errorMessage,
                        actions: ['BUY_POLYMARKET_ORDER'],
                        thought: 'Order validation failed'
                    });
                }
                return false;
            }

            // Show warnings if any
            if (validation.warnings && validation.warnings.length > 0) {
                elizaLogger.warn('Order validation warnings:', validation.warnings);
            }

            // Place the buy order
            const response = await polymarketService.placeBuyOrder(orderParams);

            if (response.success) {
                if (callback) {
                    await callback({
                        text: formatSuccessResponse(response),
                        actions: ['BUY_POLYMARKET_ORDER'],
                        thought: 'Buy order placed successfully'
                    });
                }
                return true;
            } else {
                if (callback) {
                    await callback({
                        text: `Failed to place buy order: ${response.error}`,
                        actions: ['BUY_POLYMARKET_ORDER'],
                        thought: 'Buy order failed'
                    });
                }
                return false;
            }
            
        } catch (error) {
            elizaLogger.error('Error in buy order handler:', error);
            if (callback) {
                await callback({
                    text: `Sorry, there was an error processing your buy order: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    actions: ['BUY_POLYMARKET_ORDER'],
                    thought: 'Error occurred while processing buy order'
                });
            }
            return false;
        }
    }
};

function extractOrderParams(messageText: string): BuyOrderParams | null {
    // Simple regex patterns to extract order parameters
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


function formatSuccessResponse(response: OrderResponse): string {
    const details = response.details!;
    return `Successfully placed buy order!
📊 Order Details:
- Token ID: ${details.tokenId}
- Price: $${details.price.toFixed(2)} per token
- Size: ${details.size} tokens
- Total Cost: $${(details.price * details.size).toFixed(2)}
- Order Type: ${details.orderType}
- Status: ${details.status}
- Order ID: ${response.orderId}

⚠️ Note: This is currently a simulation. Real order placement requires wallet configuration.`;
}