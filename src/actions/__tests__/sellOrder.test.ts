import { describe, expect, it, beforeEach, vi } from 'vitest';
import { type Memory, type State, type UUID, type HandlerCallback } from '@elizaos/core';
import { sellOrder } from '../sellOrder';
import { PolymarketService } from '../../services/polymarketService';
import { OrderType, OrderSide, OrderResponse, OrderValidationResult } from '../../types';

describe('sellOrder action', () => {
    let mockState: State;
    let mockRuntime: any;
    let mockPolymarketService: any;
    
    beforeEach(() => {
        mockState = {
            values: {},
            data: {},
            text: '',
            topics: [],
            recentMessages: '',
            recentPostInteractions: [],
            postDirections: '',
            agentName: 'TestAgent',
            bio: 'Test bio',
            lore: '',
            messageDirections: '',
            roomId: 'test-room-id' as `${string}-${string}-${string}-${string}-${string}`,
            actors: '',
            recentMessagesData: []
        };

        mockPolymarketService = {
            validateSellOrder: vi.fn(),
            placeSellOrder: vi.fn()
        };

        mockRuntime = {
            agentId: 'test-agent-id' as UUID,
            composeState: async () => mockState,
            getService: vi.fn().mockReturnValue(mockPolymarketService)
        };
    });

    describe('validate', () => {
        it('should validate sell order messages', async () => {
            const messages = [
                'I want to sell 10 tokens on Polymarket',
                'Place a sell order for prediction market tokens',
                'Sell my tokens from the market',
                'Liquidate my position in this Polymarket outcome',
                'Cash out my prediction market position',
                'Exit my trade on this market',
                'Sell my tokens at current price'
            ];

            for (const text of messages) {
                const message: Memory = {
                    id: 'test-id' as UUID,
                    entityId: 'test-entity' as UUID,
                    roomId: 'test-room' as UUID,
                    content: { text }
                };

                const isValid = await sellOrder.validate(mockRuntime, message, mockState);
                expect(isValid, `Message should be valid: "${text}"`).toBe(true);
            }
        });

        it('should not validate unrelated messages', async () => {
            const messages = [
                'Show me the weather',
                'Tell me a joke',
                'What time is it?',
                'Sell groceries at the store', // sell but not polymarket related
                'Check Polymarket data', // polymarket but not sell related
                'Buy tokens on Polymarket' // polymarket but buy, not sell
            ];

            for (const text of messages) {
                const message: Memory = {
                    id: 'test-id' as UUID,
                    entityId: 'test-entity' as UUID,
                    roomId: 'test-room' as UUID,
                    content: { text }
                };

                const isValid = await sellOrder.validate(mockRuntime, message, mockState);
                expect(isValid).toBe(false);
            }
        });
    });

    describe('handler', () => {
        it('should handle successful sell order placement', async () => {
            const message: Memory = {
                id: 'test-id' as UUID,
                entityId: 'test-entity' as UUID,
                roomId: 'test-room' as UUID,
                content: { text: 'Sell 10 tokens of token abc123 at $0.75 on Polymarket' }
            };

            // Mock successful validation
            const mockValidation: OrderValidationResult = {
                valid: true,
                errors: [],
                warnings: ['Selling will realize your current profit/loss on this position']
            };
            mockPolymarketService.validateSellOrder.mockResolvedValue(mockValidation);

            // Mock successful order placement
            const mockOrderResponse: OrderResponse = {
                success: true,
                orderId: 'sell_order_123',
                transactionHash: '0xdef456',
                details: {
                    tokenId: 'abc123',
                    price: 0.75,
                    size: 10,
                    side: OrderSide.SELL,
                    orderType: OrderType.GTC,
                    status: 'pending'
                }
            };
            mockPolymarketService.placeSellOrder.mockResolvedValue(mockOrderResponse);

            let receivedResponse: any = null;
            const callback: HandlerCallback = async (response) => {
                receivedResponse = response;
                return [];
            };

            const result = await sellOrder.handler(mockRuntime, message, mockState, {}, callback);

            expect(result).toBe(true);
            expect(receivedResponse).toBeDefined();
            expect(receivedResponse.actions).toContain('SELL_POLYMARKET_ORDER');
            expect(receivedResponse.text).toContain('Successfully placed sell order');
            expect(receivedResponse.text).toContain('abc123');
            expect(receivedResponse.text).toContain('$0.75');
            expect(receivedResponse.text).toContain('10 tokens');
            expect(receivedResponse.text).toContain('Total Value: $7.50');
        });

        it('should handle validation failures', async () => {
            const message: Memory = {
                id: 'test-id' as UUID,
                entityId: 'test-entity' as UUID,
                roomId: 'test-room' as UUID,
                content: { text: 'Sell 10 tokens of token abc123 at $2.00 on Polymarket' } // Invalid price > 1
            };

            // Mock validation failure
            const mockValidation: OrderValidationResult = {
                valid: false,
                errors: ['Price must be between 0 and 1'],
                warnings: []
            };
            mockPolymarketService.validateSellOrder.mockResolvedValue(mockValidation);

            let receivedResponse: any = null;
            const callback: HandlerCallback = async (response) => {
                receivedResponse = response;
                return [];
            };

            const result = await sellOrder.handler(mockRuntime, message, mockState, {}, callback);

            expect(result).toBe(false);
            expect(receivedResponse).toBeDefined();
            expect(receivedResponse.actions).toContain('SELL_POLYMARKET_ORDER');
            expect(receivedResponse.text).toContain('Invalid sell order parameters');
            expect(receivedResponse.text).toContain('Price must be between 0 and 1');
        });

        it('should handle order placement failures', async () => {
            const message: Memory = {
                id: 'test-id' as UUID,
                entityId: 'test-entity' as UUID,
                roomId: 'test-room' as UUID,
                content: { text: 'Sell 10 tokens of token abc123 at $0.75 on Polymarket' }
            };

            // Mock successful validation
            const mockValidation: OrderValidationResult = {
                valid: true,
                errors: [],
                warnings: []
            };
            mockPolymarketService.validateSellOrder.mockResolvedValue(mockValidation);

            // Mock failed order placement
            const mockOrderResponse: OrderResponse = {
                success: false,
                error: 'Insufficient tokens to sell'
            };
            mockPolymarketService.placeSellOrder.mockResolvedValue(mockOrderResponse);

            let receivedResponse: any = null;
            const callback: HandlerCallback = async (response) => {
                receivedResponse = response;
                return [];
            };

            const result = await sellOrder.handler(mockRuntime, message, mockState, {}, callback);

            expect(result).toBe(false);
            expect(receivedResponse).toBeDefined();
            expect(receivedResponse.actions).toContain('SELL_POLYMARKET_ORDER');
            expect(receivedResponse.text).toContain('Failed to place sell order');
            expect(receivedResponse.text).toContain('Insufficient tokens to sell');
        });

        it('should handle missing service', async () => {
            const message: Memory = {
                id: 'test-id' as UUID,
                entityId: 'test-entity' as UUID,
                roomId: 'test-room' as UUID,
                content: { text: 'Sell 10 tokens of token abc123 at $0.75 on Polymarket' }
            };

            // Mock missing service
            mockRuntime.getService.mockReturnValue(null);

            let receivedResponse: any = null;
            const callback: HandlerCallback = async (response) => {
                receivedResponse = response;
                return [];
            };

            const result = await sellOrder.handler(mockRuntime, message, mockState, {}, callback);

            expect(result).toBe(false);
            expect(receivedResponse).toBeDefined();
            expect(receivedResponse.actions).toContain('SELL_POLYMARKET_ORDER');
            expect(receivedResponse.text).toContain('Polymarket service is not available');
        });

        it('should handle invalid order parameters', async () => {
            const message: Memory = {
                id: 'test-id' as UUID,
                entityId: 'test-entity' as UUID,
                roomId: 'test-room' as UUID,
                content: { text: 'Sell something on Polymarket' } // Vague request without specifics
            };

            let receivedResponse: any = null;
            const callback: HandlerCallback = async (response) => {
                receivedResponse = response;
                return [];
            };

            const result = await sellOrder.handler(mockRuntime, message, mockState, {}, callback);

            expect(result).toBe(false);
            expect(receivedResponse).toBeDefined();
            expect(receivedResponse.actions).toContain('SELL_POLYMARKET_ORDER');
            expect(receivedResponse.text).toContain("couldn't understand your sell order request");
        });

        it('should handle exceptions gracefully', async () => {
            const message: Memory = {
                id: 'test-id' as UUID,
                entityId: 'test-entity' as UUID,
                roomId: 'test-room' as UUID,
                content: { text: 'Sell 10 tokens of token abc123 at $0.75 on Polymarket' }
            };

            // Mock service to throw an error
            mockPolymarketService.validateSellOrder.mockRejectedValue(new Error('Network error'));

            let receivedResponse: any = null;
            const callback: HandlerCallback = async (response) => {
                receivedResponse = response;
                return [];
            };

            const result = await sellOrder.handler(mockRuntime, message, mockState, {}, callback);

            expect(result).toBe(false);
            expect(receivedResponse).toBeDefined();
            expect(receivedResponse.actions).toContain('SELL_POLYMARKET_ORDER');
            expect(receivedResponse.text).toContain('error processing your sell order');
            expect(receivedResponse.text).toContain('Network error');
        });

        it('should handle validation with warnings', async () => {
            const message: Memory = {
                id: 'test-id' as UUID,
                entityId: 'test-entity' as UUID,
                roomId: 'test-room' as UUID,
                content: { text: 'Sell 100 tokens of token abc123 at $0.01 on Polymarket' } // Very low price
            };

            // Mock validation with warnings
            const mockValidation: OrderValidationResult = {
                valid: true,
                errors: [],
                warnings: [
                    'Very low sell price - you may want to hold longer or set a higher price',
                    'Selling will realize your current profit/loss on this position'
                ]
            };
            mockPolymarketService.validateSellOrder.mockResolvedValue(mockValidation);

            // Mock successful order placement
            const mockOrderResponse: OrderResponse = {
                success: true,
                orderId: 'sell_order_456',
                transactionHash: '0xabc789',
                details: {
                    tokenId: 'abc123',
                    price: 0.01,
                    size: 100,
                    side: OrderSide.SELL,
                    orderType: OrderType.GTC,
                    status: 'pending'
                }
            };
            mockPolymarketService.placeSellOrder.mockResolvedValue(mockOrderResponse);

            let receivedResponse: any = null;
            const callback: HandlerCallback = async (response) => {
                receivedResponse = response;
                return [];
            };

            const result = await sellOrder.handler(mockRuntime, message, mockState, {}, callback);

            expect(result).toBe(true);
            expect(receivedResponse).toBeDefined();
            expect(receivedResponse.text).toContain('Successfully placed sell order');
            expect(receivedResponse.text).toContain('$0.01');
            expect(receivedResponse.text).toContain('100 tokens');
            expect(receivedResponse.text).toContain('Total Value: $1.00');
        });
    });
});