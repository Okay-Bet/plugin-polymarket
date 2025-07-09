import { describe, expect, it, beforeEach, vi } from 'vitest';
import { type Memory, type State, type UUID, type HandlerCallback } from '@elizaos/core';
import { redeemOrder } from '../redeemOrder.js';
import { PolymarketService } from '../../services/polymarketService.js';
import { RedeemValidationResult, RedeemResponse, RedeemablePosition } from '../../types.js';

describe('redeemOrder action', () => {
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
            validateRedeemPositions: vi.fn(),
            redeemPositions: vi.fn(),
            getRedeemablePositions: vi.fn(),
            isWalletConfigured: vi.fn()
        };

        mockRuntime = {
            agentId: 'test-agent-id' as UUID,
            composeState: async () => mockState,
            getService: vi.fn().mockReturnValue(mockPolymarketService)
        };
    });

    describe('validate', () => {
        it('should validate redeem messages', async () => {
            const messages = [
                'Redeem my winnings on Polymarket',
                'Claim my prediction market winnings',
                'Cash out my winnings from resolved markets',
                'Collect winnings from Polymarket positions',
                'Redeem my positions from completed markets',
                'Claim payout from my Polymarket winnings',
                'Withdraw winnings from resolved prediction markets'
            ];

            for (const text of messages) {
                const message: Memory = {
                    id: 'test-id' as UUID,
                    entityId: 'test-entity' as UUID,
                    roomId: 'test-room' as UUID,
                    content: { text }
                };

                const isValid = await redeemOrder.validate(mockRuntime, message, mockState);
                expect(isValid, `Message should be valid: "${text}"`).toBe(true);
            }
        });

        it('should not validate unrelated messages', async () => {
            const messages = [
                'Show me the weather',
                'Tell me a joke',
                'What time is it?',
                'Redeem my groceries at the store', // redeem but not polymarket related
                'Check Polymarket data', // polymarket but not redeem related
                'Buy tokens on Polymarket' // polymarket but buy, not redeem
            ];

            for (const text of messages) {
                const message: Memory = {
                    id: 'test-id' as UUID,
                    entityId: 'test-entity' as UUID,
                    roomId: 'test-room' as UUID,
                    content: { text }
                };

                const isValid = await redeemOrder.validate(mockRuntime, message, mockState);
                expect(isValid).toBe(false);
            }
        });
    });

    describe('handler', () => {
        it('should handle wallet not configured', async () => {
            const message: Memory = {
                id: 'test-id' as UUID,
                entityId: 'test-entity' as UUID,
                roomId: 'test-room' as UUID,
                content: { text: 'Redeem my winnings on Polymarket' }
            };

            mockPolymarketService.isWalletConfigured.mockReturnValue(false);

            let receivedResponse: any = null;
            const callback: HandlerCallback = async (response) => {
                receivedResponse = response;
                return [];
            };

            const result = await redeemOrder.handler(mockRuntime, message, mockState, {}, callback);

            expect(result).toBe(false);
            expect(receivedResponse).toBeDefined();
            expect(receivedResponse.text).toContain('Wallet configuration is required');
        });

        it('should show available redeemable positions when no specifics mentioned', async () => {
            const message: Memory = {
                id: 'test-id' as UUID,
                entityId: 'test-entity' as UUID,
                roomId: 'test-room' as UUID,
                content: { text: 'Show me my winnings on Polymarket' }
            };

            mockPolymarketService.isWalletConfigured.mockReturnValue(true);

            const mockPositions: RedeemablePosition[] = [
                {
                    tokenId: 'test-token-123',
                    marketId: 'test-market-1',
                    marketQuestion: 'Will Bitcoin reach $100k in 2024?',
                    amount: 50,
                    winningOutcome: 'Yes',
                    estimatedPayout: 50.0,
                    marketResolved: true,
                    payoutsReported: true
                }
            ];
            mockPolymarketService.getRedeemablePositions.mockResolvedValue(mockPositions);

            let receivedResponse: any = null;
            const callback: HandlerCallback = async (response) => {
                receivedResponse = response;
                return [];
            };

            const result = await redeemOrder.handler(mockRuntime, message, mockState, {}, callback);

            expect(result).toBe(true);
            expect(receivedResponse).toBeDefined();
            expect(receivedResponse.text).toContain('Found 1 redeemable position');
            expect(receivedResponse.text).toContain('Will Bitcoin reach $100k in 2024?');
            expect(receivedResponse.text).toContain('$50.00 USDC');
        });

        it('should handle no redeemable positions', async () => {
            const message: Memory = {
                id: 'test-id' as UUID,
                entityId: 'test-entity' as UUID,
                roomId: 'test-room' as UUID,
                content: { text: 'Redeem my winnings on Polymarket' }
            };

            mockPolymarketService.isWalletConfigured.mockReturnValue(true);
            mockPolymarketService.getRedeemablePositions.mockResolvedValue([]);

            let receivedResponse: any = null;
            const callback: HandlerCallback = async (response) => {
                receivedResponse = response;
                return [];
            };

            const result = await redeemOrder.handler(mockRuntime, message, mockState, {}, callback);

            expect(result).toBe(false);
            expect(receivedResponse).toBeDefined();
            expect(receivedResponse.text).toContain('No redeemable positions found');
        });

        it('should handle successful redemption', async () => {
            const message: Memory = {
                id: 'test-id' as UUID,
                entityId: 'test-entity' as UUID,
                roomId: 'test-room' as UUID,
                content: { text: 'Redeem all my positions on Polymarket' }
            };

            mockPolymarketService.isWalletConfigured.mockReturnValue(true);

            // Mock fetching redeemable positions since message contains "all"
            const mockPositions: RedeemablePosition[] = [
                {
                    tokenId: 'test-token-123',
                    marketId: 'test-market-1',
                    marketQuestion: 'Will Bitcoin reach $100k in 2024?',
                    amount: 50,
                    winningOutcome: 'Yes',
                    estimatedPayout: 50.0,
                    marketResolved: true,
                    payoutsReported: true
                },
                {
                    tokenId: 'test-token-456',
                    marketId: 'test-market-2',
                    marketQuestion: 'Will AI achieve AGI by 2025?',
                    amount: 25,
                    winningOutcome: 'No',
                    estimatedPayout: 25.0,
                    marketResolved: true,
                    payoutsReported: true
                }
            ];
            mockPolymarketService.getRedeemablePositions.mockResolvedValue(mockPositions);

            // Mock successful validation
            const mockValidation: RedeemValidationResult = {
                valid: true,
                errors: [],
                warnings: ['Large batch redemption may require higher gas fees'],
                totalPayout: 75.0,
                gasEstimate: '~0.01 ETH'
            };
            mockPolymarketService.validateRedeemPositions.mockResolvedValue(mockValidation);

            // Mock successful redemption
            const mockRedeemResponse: RedeemResponse = {
                success: true,
                transactionHash: '0xdef456',
                details: {
                    redeemedPositions: [
                        {
                            tokenId: 'test-token-123',
                            amount: 50,
                            payout: 50.0
                        },
                        {
                            tokenId: 'test-token-456',
                            amount: 25,
                            payout: 25.0
                        }
                    ],
                    totalPayout: 75.0,
                    gasUsed: '0.008',
                    status: 'confirmed'
                }
            };
            mockPolymarketService.redeemPositions.mockResolvedValue(mockRedeemResponse);

            let receivedResponse: any = null;
            const callback: HandlerCallback = async (response) => {
                receivedResponse = response;
                return [];
            };

            const result = await redeemOrder.handler(mockRuntime, message, mockState, {}, callback);

            expect(result).toBe(true);
            expect(receivedResponse).toBeDefined();
            expect(receivedResponse.text).toContain('Successfully redeemed 2 positions');
            expect(receivedResponse.text).toContain('Total Payout: $75.00 USDC');
            expect(receivedResponse.text).toContain('0xdef456');
        });

        it('should handle redemption validation failures', async () => {
            const message: Memory = {
                id: 'test-id' as UUID,
                entityId: 'test-entity' as UUID,
                roomId: 'test-room' as UUID,
                content: { text: 'Redeem all positions on Polymarket' }
            };

            mockPolymarketService.isWalletConfigured.mockReturnValue(true);

            // Mock positions that will fail validation
            const mockPositions: RedeemablePosition[] = [
                {
                    tokenId: '',
                    marketId: 'test-market-1',
                    marketQuestion: 'Test market',
                    amount: -1,
                    winningOutcome: 'Yes',
                    estimatedPayout: 50.0,
                    marketResolved: false,
                    payoutsReported: false
                }
            ];
            mockPolymarketService.getRedeemablePositions.mockResolvedValue(mockPositions);

            // Mock validation failure
            const mockValidation: RedeemValidationResult = {
                valid: false,
                errors: ['No positions are currently ready for redemption'],
                warnings: []
            };
            mockPolymarketService.validateRedeemPositions.mockResolvedValue(mockValidation);

            let receivedResponse: any = null;
            const callback: HandlerCallback = async (response) => {
                receivedResponse = response;
                return [];
            };

            const result = await redeemOrder.handler(mockRuntime, message, mockState, {}, callback);

            expect(result).toBe(false);
            expect(receivedResponse).toBeDefined();
            expect(receivedResponse.text).toContain('Invalid redeem parameters');
            expect(receivedResponse.text).toContain('No positions are currently ready for redemption');
        });

        it('should handle redemption failures', async () => {
            const message: Memory = {
                id: 'test-id' as UUID,
                entityId: 'test-entity' as UUID,
                roomId: 'test-room' as UUID,
                content: { text: 'Redeem all my positions on Polymarket' }
            };

            mockPolymarketService.isWalletConfigured.mockReturnValue(true);

            // Mock positions to be fetched
            const mockPositions: RedeemablePosition[] = [
                {
                    tokenId: 'test-token-123',
                    marketId: 'test-market-1',
                    marketQuestion: 'Will Bitcoin reach $100k in 2024?',
                    amount: 50,
                    winningOutcome: 'Yes',
                    estimatedPayout: 50.0,
                    marketResolved: true,
                    payoutsReported: true
                }
            ];
            mockPolymarketService.getRedeemablePositions.mockResolvedValue(mockPositions);

            // Mock successful validation
            const mockValidation: RedeemValidationResult = {
                valid: true,
                errors: [],
                warnings: [],
                totalPayout: 50.0
            };
            mockPolymarketService.validateRedeemPositions.mockResolvedValue(mockValidation);

            // Mock failed redemption
            const mockRedeemResponse: RedeemResponse = {
                success: false,
                error: 'Transaction failed due to insufficient gas'
            };
            mockPolymarketService.redeemPositions.mockResolvedValue(mockRedeemResponse);

            let receivedResponse: any = null;
            const callback: HandlerCallback = async (response) => {
                receivedResponse = response;
                return [];
            };

            const result = await redeemOrder.handler(mockRuntime, message, mockState, {}, callback);

            expect(result).toBe(false);
            expect(receivedResponse).toBeDefined();
            expect(receivedResponse.text).toContain('Failed to redeem positions');
            expect(receivedResponse.text).toContain('Transaction failed due to insufficient gas');
        });

        it('should handle missing service', async () => {
            const message: Memory = {
                id: 'test-id' as UUID,
                entityId: 'test-entity' as UUID,
                roomId: 'test-room' as UUID,
                content: { text: 'Redeem my winnings on Polymarket' }
            };

            mockRuntime.getService.mockReturnValue(null);

            let receivedResponse: any = null;
            const callback: HandlerCallback = async (response) => {
                receivedResponse = response;
                return [];
            };

            const result = await redeemOrder.handler(mockRuntime, message, mockState, {}, callback);

            expect(result).toBe(false);
            expect(receivedResponse).toBeDefined();
            expect(receivedResponse.text).toContain('Polymarket service is not available');
        });

        it('should handle exceptions gracefully', async () => {
            const message: Memory = {
                id: 'test-id' as UUID,
                entityId: 'test-entity' as UUID,
                roomId: 'test-room' as UUID,
                content: { text: 'Redeem my winnings on Polymarket' }
            };

            mockPolymarketService.isWalletConfigured.mockReturnValue(true);
            mockPolymarketService.getRedeemablePositions.mockRejectedValue(new Error('Network error'));

            let receivedResponse: any = null;
            const callback: HandlerCallback = async (response) => {
                receivedResponse = response;
                return [];
            };

            const result = await redeemOrder.handler(mockRuntime, message, mockState, {}, callback);

            expect(result).toBe(false);
            expect(receivedResponse).toBeDefined();
            expect(receivedResponse.text).toContain('Error fetching redeemable positions');
            expect(receivedResponse.text).toContain('Network error');
        });

        it('should handle error fetching redeemable positions', async () => {
            const message: Memory = {
                id: 'test-id' as UUID,
                entityId: 'test-entity' as UUID,
                roomId: 'test-room' as UUID,
                content: { text: 'Show my Polymarket winnings' }
            };

            mockPolymarketService.isWalletConfigured.mockReturnValue(true);
            mockPolymarketService.getRedeemablePositions.mockRejectedValue(new Error('API rate limit exceeded'));

            let receivedResponse: any = null;
            const callback: HandlerCallback = async (response) => {
                receivedResponse = response;
                return [];
            };

            const result = await redeemOrder.handler(mockRuntime, message, mockState, {}, callback);

            expect(result).toBe(false);
            expect(receivedResponse).toBeDefined();
            expect(receivedResponse.text).toContain('Error fetching redeemable positions');
            expect(receivedResponse.text).toContain('API rate limit exceeded');
        });

        it('should format multiple redeemable positions correctly', async () => {
            const message: Memory = {
                id: 'test-id' as UUID,
                entityId: 'test-entity' as UUID,
                roomId: 'test-room' as UUID,
                content: { text: 'Show my winnings on Polymarket' }
            };

            mockPolymarketService.isWalletConfigured.mockReturnValue(true);

            const mockPositions: RedeemablePosition[] = [
                {
                    tokenId: 'test-token-123',
                    marketId: 'test-market-1',
                    marketQuestion: 'Will Bitcoin reach $100k in 2024?',
                    amount: 50,
                    winningOutcome: 'Yes',
                    estimatedPayout: 50.0,
                    marketResolved: true,
                    payoutsReported: true
                },
                {
                    tokenId: 'test-token-456',
                    marketId: 'test-market-2',
                    marketQuestion: 'Will AI achieve AGI by 2025?',
                    amount: 25,
                    winningOutcome: 'No',
                    estimatedPayout: 25.0,
                    marketResolved: true,
                    payoutsReported: false // Not ready yet
                }
            ];
            mockPolymarketService.getRedeemablePositions.mockResolvedValue(mockPositions);

            let receivedResponse: any = null;
            const callback: HandlerCallback = async (response) => {
                receivedResponse = response;
                return [];
            };

            const result = await redeemOrder.handler(mockRuntime, message, mockState, {}, callback);

            expect(result).toBe(true);
            expect(receivedResponse).toBeDefined();
            expect(receivedResponse.text).toContain('Found 2 redeemable positions');
            expect(receivedResponse.text).toContain('Will Bitcoin reach $100k in 2024?');
            expect(receivedResponse.text).toContain('Will AI achieve AGI by 2025?');
            expect(receivedResponse.text).toContain('✅ Ready to redeem');
            expect(receivedResponse.text).toContain('⏳ Pending settlement');
            expect(receivedResponse.text).toContain('Total Available for Redemption: $50.00 USDC');
        });
    });
});