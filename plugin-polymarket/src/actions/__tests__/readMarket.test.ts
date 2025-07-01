import { describe, expect, it, beforeEach } from 'vitest';
import { type Memory, type State, type UUID, type HandlerCallback } from '@elizaos/core';
import { readMarkets } from '../readMarkets';
import { polymarketService } from '../../services/polymarketService';
import { PolymarketMarket } from '../../types';

describe('readMarkets action', () => {
    let mockState: State;
    let mockRuntime: any;
    
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

        mockRuntime = {
            agentId: 'test-agent-id' as UUID,
            composeState: async () => mockState,
            getService: () => polymarketService
        };
    });

    it('should validate messages about Polymarket', async () => {
        const messages = [
            'Show me the top prediction markets on Polymarket',
            'What are the current odds on Polymarket about Bitcoin?',
            'List prediction markets',
            'Get betting odds from Polymarket'
        ];

        for (const text of messages) {
            const message: Memory = {
                id: 'test-id' as UUID,
                entityId: 'test-entity' as UUID,
                roomId: 'test-room' as UUID,
                content: { text }
            };

            const isValid = await readMarkets.validate(mockRuntime, message, mockState);
            expect(isValid).toBe(true);
        }
    });

    it('should not validate unrelated messages', async () => {
        const messages = [
            'How is the weather today?',
            'Tell me a joke',
            'What time is it?'
        ];

        for (const text of messages) {
            const message: Memory = {
                id: 'test-id' as UUID,
                entityId: 'test-entity' as UUID,
                roomId: 'test-room' as UUID,
                content: { text }
            };

            const isValid = await readMarkets.validate(mockRuntime, message, mockState);
            expect(isValid).toBe(false);
        }
    });

    it('should handle market queries successfully', async () => {
        const message: Memory = {
            id: 'test-id' as UUID,
            entityId: 'test-entity' as UUID,
            roomId: 'test-room' as UUID,
            content: { text: 'Show me prediction markets about Bitcoin' }
        };

        const mockMarkets: PolymarketMarket[] = [
            {
                id: 'market-1',
                slug: 'btc-100k-2024',
                question: 'Will Bitcoin reach $100k in 2024?',
                active: true,
                volume: 1000000,
                liquidity: 500000,
                url: 'https://polymarket.com/btc-100k-2024',
                endDate: '2024-12-31',
                outcomes: [
                    { clobTokenId: 'yes-token', name: 'Yes', price: 0.65 },
                    { clobTokenId: 'no-token', name: 'No', price: 0.35 }
                ]
            }
        ];

        // Mock the polymarketService.fetchMarkets method
        const originalFetchMarkets = polymarketService.fetchMarkets;
        polymarketService.fetchMarkets = async () => ({
            success: true,
            markets: mockMarkets
        });

        let receivedResponse: any = null;
        const callback: HandlerCallback = async (response) => {
            receivedResponse = response;
            return [];
        };

        const result = await readMarkets.handler(mockRuntime, message, mockState, {}, callback);

        expect(result).toBe(true);
        expect(receivedResponse).toBeDefined();
        expect(receivedResponse.actions).toContain('READ_POLYMARKET_MARKETS');
        expect(receivedResponse.text).toContain('Bitcoin');
        expect(receivedResponse.text).toContain('$0.65');
        expect(receivedResponse.thought).toBeDefined();

        // Restore the original method
        polymarketService.fetchMarkets = originalFetchMarkets;
    });

    it('should handle errors gracefully', async () => {
        const message: Memory = {
            id: 'test-id' as UUID,
            entityId: 'test-entity' as UUID,
            roomId: 'test-room' as UUID,
            content: { text: 'Show me prediction markets' }
        };

        // Mock the service to throw an error
        const originalFetchMarkets = polymarketService.fetchMarkets;
        polymarketService.fetchMarkets = async () => {
            throw new Error('API Error');
        };

        let receivedResponse: any = null;
        const callback: HandlerCallback = async (response) => {
            receivedResponse = response;
            return [];
        };

        const result = await readMarkets.handler(mockRuntime, message, mockState, {}, callback);

        expect(result).toBe(false);
        expect(receivedResponse).toBeDefined();
        expect(receivedResponse.actions).toContain('READ_POLYMARKET_MARKETS');
        expect(receivedResponse.text).toContain('error');
        expect(receivedResponse.thought).toContain('Error occurred');

        // Restore the original method
        polymarketService.fetchMarkets = originalFetchMarkets;
    });

    it('should handle empty market results', async () => {
        const message: Memory = {
            id: 'test-id' as UUID,
            entityId: 'test-entity' as UUID,
            roomId: 'test-room' as UUID,
            content: { text: 'Show me prediction markets about NonexistentTopic' }
        };

        // Mock the service to return no markets
        const originalFetchMarkets = polymarketService.fetchMarkets;
        polymarketService.fetchMarkets = async () => ({
            success: true,
            markets: []
        });

        let receivedResponse: any = null;
        const callback: HandlerCallback = async (response) => {
            receivedResponse = response;
            return [];
        };

        const result = await readMarkets.handler(mockRuntime, message, mockState, {}, callback);

        expect(result).toBe(true);
        expect(receivedResponse).toBeDefined();
        expect(receivedResponse.actions).toContain('READ_POLYMARKET_MARKETS');
        expect(receivedResponse.text).toContain('couldn\'t find any prediction markets');
        expect(receivedResponse.text).toContain('NonexistentTopic');
        expect(receivedResponse.thought).toBeDefined();

        // Restore the original method
        polymarketService.fetchMarkets = originalFetchMarkets;
    });
});