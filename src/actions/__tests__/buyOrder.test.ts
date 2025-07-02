import { describe, expect, it, beforeEach, vi } from 'vitest';
import { type Memory, type State, type UUID, type HandlerCallback } from '@elizaos/core';
import { buyOrder } from '../buyOrder';
import { PolymarketService } from '../../services/polymarketService';
import { OrderType, OrderSide, OrderResponse, OrderValidationResult } from '../../types';

describe('buyOrder action', () => {
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
            validateOrder: vi.fn(),
            placeBuyOrder: vi.fn()
        };

        mockRuntime = {
            agentId: 'test-agent-id' as UUID,
            composeState: async () => mockState,
            getService: vi.fn().mockReturnValue(mockPolymarketService)
        };
    });

    describe('validate', () => {
        it('should validate buy order messages', async () => {
            const messages = [
                'I want to buy 10 tokens on Polymarket',
                'Place a buy order for prediction market tokens',
                'Purchase tokens from the market',
                'Invest in this Polymarket outcome',
                'Get position in this prediction market'
            ];

            for (const text of messages) {
                const message: Memory = {
                    id: 'test-id' as UUID,
                    entityId: 'test-entity' as UUID,
                    roomId: 'test-room' as UUID,
                    content: { text }
                };

                const isValid = await buyOrder.validate(mockRuntime, message, mockState);
                expect(isValid).toBe(true);
            }
        });

        it('should not validate unrelated messages', async () => {
            const messages = [
                'Show me the weather',
                'Tell me a joke',
                'What time is it?',
                'Buy groceries at the store', // buy but not polymarket related
                'Check Polymarket data' // polymarket but not buy related
            ];

            for (const text of messages) {
                const message: Memory = {
                    id: 'test-id' as UUID,
                    entityId: 'test-entity' as UUID,
                    roomId: 'test-room' as UUID,
                    content: { text }
                };

                const isValid = await buyOrder.validate(mockRuntime, message, mockState);
                expect(isValid).toBe(false);
            }
        });
    });

    describe('handler', () => {
        it('should handle successful buy order placement', async () => {
            const message: Memory = {
                id: 'test-id' as UUID,
                entityId: 'test-entity' as UUID,
                roomId: 'test-room' as UUID,
                content: { text: 'Buy 10 tokens of token abc123 at $0.65 on Polymarket' }
            };

            // Mock successful validation
            const mockValidation: OrderValidationResult = {
                valid: true,
                errors: [],
                warnings: []
            };
            mockPolymarketService.validateOrder.mockResolvedValue(mockValidation);

            // Mock successful order placement
            const mockOrderResponse: OrderResponse = {
                success: true,
                orderId: 'order_123',
                transactionHash: '0xabc123',
                details: {
                    tokenId: 'abc123',
                    price: 0.65,
                    size: 10,
                    side: OrderSide.BUY,
                    orderType: OrderType.GTC,
                    status: 'pending'
                }
            };
            mockPolymarketService.placeBuyOrder.mockResolvedValue(mockOrderResponse);

            let receivedResponse: any = null;
            const callback: HandlerCallback = async (response) => {
                receivedResponse = response;
                return [];
            };

            const result = await buyOrder.handler(mockRuntime, message, mockState, {}, callback);

            expect(result).toBe(true);
            expect(receivedResponse).toBeDefined();
            expect(receivedResponse.actions).toContain('BUY_POLYMARKET_ORDER');
            expect(receivedResponse.text).toContain('Successfully placed buy order');
            expect(receivedResponse.text).toContain('abc123');
            expect(receivedResponse.text).toContain('$0.65');
            expect(receivedResponse.text).toContain('10 tokens');
        });

        it('should handle validation failures', async () => {
            const message: Memory = {
                id: 'test-id' as UUID,
                entityId: 'test-entity' as UUID,
                roomId: 'test-room' as UUID,
                content: { text: 'Buy 10 tokens of token abc123 at $2.00 on Polymarket' } // Invalid price > 1
            };

            // Mock validation failure
            const mockValidation: OrderValidationResult = {
                valid: false,
                errors: ['Price must be between 0 and 1'],
                warnings: []
            };
            mockPolymarketService.validateOrder.mockResolvedValue(mockValidation);

            let receivedResponse: any = null;
            const callback: HandlerCallback = async (response) => {
                receivedResponse = response;
                return [];
            };

            const result = await buyOrder.handler(mockRuntime, message, mockState, {}, callback);

            expect(result).toBe(false);
            expect(receivedResponse).toBeDefined();
            expect(receivedResponse.actions).toContain('BUY_POLYMARKET_ORDER');
            expect(receivedResponse.text).toContain('Invalid order parameters');
            expect(receivedResponse.text).toContain('Price must be between 0 and 1');
        });

        it('should handle order placement failures', async () => {
            const message: Memory = {
                id: 'test-id' as UUID,
                entityId: 'test-entity' as UUID,
                roomId: 'test-room' as UUID,
                content: { text: 'Buy 10 tokens of token abc123 at $0.65 on Polymarket' }
            };

            // Mock successful validation
            const mockValidation: OrderValidationResult = {
                valid: true,
                errors: [],
                warnings: []
            };
            mockPolymarketService.validateOrder.mockResolvedValue(mockValidation);

            // Mock failed order placement
            const mockOrderResponse: OrderResponse = {
                success: false,
                error: 'Insufficient balance'
            };
            mockPolymarketService.placeBuyOrder.mockResolvedValue(mockOrderResponse);

            let receivedResponse: any = null;
            const callback: HandlerCallback = async (response) => {
                receivedResponse = response;
                return [];
            };

            const result = await buyOrder.handler(mockRuntime, message, mockState, {}, callback);

            expect(result).toBe(false);
            expect(receivedResponse).toBeDefined();
            expect(receivedResponse.actions).toContain('BUY_POLYMARKET_ORDER');
            expect(receivedResponse.text).toContain('Failed to place buy order');
            expect(receivedResponse.text).toContain('Insufficient balance');
        });

        it('should handle missing service', async () => {
            const message: Memory = {
                id: 'test-id' as UUID,
                entityId: 'test-entity' as UUID,
                roomId: 'test-room' as UUID,
                content: { text: 'Buy 10 tokens of token abc123 at $0.65 on Polymarket' }
            };

            // Mock missing service
            mockRuntime.getService.mockReturnValue(null);

            let receivedResponse: any = null;
            const callback: HandlerCallback = async (response) => {
                receivedResponse = response;
                return [];
            };

            const result = await buyOrder.handler(mockRuntime, message, mockState, {}, callback);

            expect(result).toBe(false);
            expect(receivedResponse).toBeDefined();
            expect(receivedResponse.actions).toContain('BUY_POLYMARKET_ORDER');
            expect(receivedResponse.text).toContain('Polymarket service is not available');
        });

        it('should handle invalid order parameters', async () => {
            const message: Memory = {
                id: 'test-id' as UUID,
                entityId: 'test-entity' as UUID,
                roomId: 'test-room' as UUID,
                content: { text: 'Buy something on Polymarket' } // Vague request without specifics
            };

            let receivedResponse: any = null;
            const callback: HandlerCallback = async (response) => {
                receivedResponse = response;
                return [];
            };

            const result = await buyOrder.handler(mockRuntime, message, mockState, {}, callback);

            expect(result).toBe(false);
            expect(receivedResponse).toBeDefined();
            expect(receivedResponse.actions).toContain('BUY_POLYMARKET_ORDER');
            expect(receivedResponse.text).toContain("couldn't understand your buy order request");
        });

        it('should handle exceptions gracefully', async () => {
            const message: Memory = {
                id: 'test-id' as UUID,
                entityId: 'test-entity' as UUID,
                roomId: 'test-room' as UUID,
                content: { text: 'Buy 10 tokens of token abc123 at $0.65 on Polymarket' }
            };

            // Mock service to throw an error
            mockPolymarketService.validateOrder.mockRejectedValue(new Error('Network error'));

            let receivedResponse: any = null;
            const callback: HandlerCallback = async (response) => {
                receivedResponse = response;
                return [];
            };

            const result = await buyOrder.handler(mockRuntime, message, mockState, {}, callback);

            expect(result).toBe(false);
            expect(receivedResponse).toBeDefined();
            expect(receivedResponse.actions).toContain('BUY_POLYMARKET_ORDER');
            expect(receivedResponse.text).toContain('error processing your buy order');
            expect(receivedResponse.text).toContain('Network error');
        });
    });
});