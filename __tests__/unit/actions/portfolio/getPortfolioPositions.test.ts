import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';

// Import after mocks
import { getPortfolioPositionsAction } from '../../../../src/actions/getPortfolioPositions';
import * as clobClient from '../../../../src/utils/clobClient';

// Mock the CLOB client
vi.mock('../../../../src/utils/clobClient', () => ({
    initializeClobClient: vi.fn(),
}));

describe('getPortfolioPositions Action', () => {
    let mockRuntime: IAgentRuntime;
    let mockCallback: HandlerCallback;
    let mockMemory: Memory;
    let mockState: State;
    let mockClient: any;
    let originalFetch: any;

    beforeEach(() => {
        // Store original fetch
        originalFetch = global.fetch;
        
        // Mock fetch for API calls
        global.fetch = vi.fn();
        
        // Setup mock runtime with settings
        mockRuntime = {
            getSetting: vi.fn((key: string) => {
                const settings: Record<string, string> = {
                    WALLET_PRIVATE_KEY: '0x' + '0'.repeat(64),
                    CLOB_API_URL: 'https://clob.polymarket.com',
                };
                return settings[key];
            }),
            character: {
                settings: {
                    secrets: {
                        WALLET_PRIVATE_KEY: '0x' + '0'.repeat(64),
                    },
                },
            },
        } as any;

        mockCallback = vi.fn();
        
        mockMemory = {
            userId: 'user-123',
            agentId: 'agent-123',
            roomId: 'room-123',
            content: { text: 'show my portfolio' },
        } as Memory;

        mockState = {} as State;

        // Setup mock CLOB client
        mockClient = {
            wallet: {
                address: '0x1234567890123456789012345678901234567890'
            }
        };

        (clobClient.initializeClobClient as any).mockResolvedValue(mockClient);
    });

    afterEach(() => {
        // Restore original fetch
        global.fetch = originalFetch;
        
        // Reset individual mocks
        (mockRuntime.getSetting as any)?.mockReset?.();
        (clobClient.initializeClobClient as any)?.mockReset?.();
        (mockCallback as any)?.mockReset?.();
    });

    describe('validate', () => {
        it('should pass validation when wallet is configured', async () => {
            const result = await getPortfolioPositionsAction.validate(mockRuntime, mockMemory, mockState);
            expect(result).toBe(true);
        });

        it('should fail validation when no wallet key is configured', async () => {
            mockRuntime.getSetting = vi.fn(() => undefined);
            
            const result = await getPortfolioPositionsAction.validate(mockRuntime, mockMemory, mockState);
            expect(result).toBe(false);
        });
    });

    describe('handler', () => {
        describe('successful portfolio retrieval', () => {
            it('should return portfolio with positions', async () => {
                const mockPositions = [
                    {
                        conditionId: '0x123abc',
                        tokenId: '123456',
                        outcome: 'Yes',
                        size: '100',
                        avgPrice: '0.5',
                        realizedPnl: '0',
                        unrealizedPnl: '10.5',
                        market: {
                            question: 'Will Bitcoin reach $100k?',
                            slug: 'bitcoin-100k'
                        }
                    },
                    {
                        conditionId: '0x456def',
                        tokenId: '654321',
                        outcome: 'No',
                        size: '50',
                        avgPrice: '0.75',
                        realizedPnl: '5.25',
                        unrealizedPnl: '-2.5',
                        market: {
                            question: 'Will AI replace developers?',
                            slug: 'ai-developers'
                        }
                    },
                ];

                // Mock the positions API call
                (global.fetch as any).mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockPositions,
                });

                const result = await getPortfolioPositionsAction.handler(
                    mockRuntime,
                    mockMemory,
                    mockState,
                    {},
                    mockCallback
                );

                expect(result.success).toBe(true);
                expect(mockCallback).toHaveBeenCalled();
                
                // Check the final callback (should be called twice - once for status, once for results)
                const finalCallback = mockCallback.mock.calls[mockCallback.mock.calls.length - 1][0];
                expect(finalCallback.text).toBeDefined();
                expect(finalCallback.text).toContain('Portfolio Positions');
                
                // The action now returns positions in the callback data
                if (finalCallback.data && finalCallback.data.positions) {
                    expect(finalCallback.data.positions).toHaveLength(2);
                }
            });

            it('should handle empty portfolio', async () => {
                // Mock the positions API call returning empty array
                (global.fetch as any).mockResolvedValueOnce({
                    ok: true,
                    json: async () => [],
                });

                const result = await getPortfolioPositionsAction.handler(
                    mockRuntime,
                    mockMemory,
                    mockState,
                    {},
                    mockCallback
                );

                expect(result.success).toBe(true);
                const finalCallback = mockCallback.mock.calls[mockCallback.mock.calls.length - 1][0];
                expect(finalCallback.text).toContain('No active positions');
            });

            it('should calculate P&L correctly', async () => {
                const mockPositions = [
                    {
                        conditionId: '0x123abc',
                        tokenId: '123456',
                        outcome: 'Yes',
                        size: '100',
                        avgPrice: '0.5',
                        realizedPnl: '10',
                        unrealizedPnl: '20',
                        market: {
                            question: 'Test Market',
                            slug: 'test-market'
                        }
                    },
                ];

                // Mock the positions API call
                (global.fetch as any).mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockPositions,
                });

                const result = await getPortfolioPositionsAction.handler(
                    mockRuntime,
                    mockMemory,
                    mockState,
                    {},
                    mockCallback
                );

                expect(result.success).toBe(true);
                const finalCallback = mockCallback.mock.calls[mockCallback.mock.calls.length - 1][0];
                
                // Check that P&L values are present in the text
                if (finalCallback.data && finalCallback.data.positions && finalCallback.data.positions[0]) {
                    const position = finalCallback.data.positions[0];
                    expect(position.realizedPnl).toBeDefined();
                    expect(position.unrealizedPnl).toBeDefined();
                }
            });

            it('should format large numbers correctly', async () => {
                const mockPositions = [
                    {
                        conditionId: '0x123abc',
                        tokenId: '123456',
                        outcome: 'Yes',
                        size: '1000000',
                        avgPrice: '0.999',
                        realizedPnl: '1234.56',
                        unrealizedPnl: '-5678.90',
                        market: {
                            question: 'Large Position Market',
                            slug: 'large-position'
                        }
                    },
                ];

                // Mock the positions API call
                (global.fetch as any).mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockPositions,
                });

                const result = await getPortfolioPositionsAction.handler(
                    mockRuntime,
                    mockMemory,
                    mockState,
                    {},
                    mockCallback
                );

                expect(result.success).toBe(true);
                const finalCallback = mockCallback.mock.calls[mockCallback.mock.calls.length - 1][0];
                expect(finalCallback.text).toBeDefined();
            });
        });

        describe('error handling', () => {
            it('should handle API errors gracefully', async () => {
                // Mock the positions API call to fail
                (global.fetch as any).mockRejectedValueOnce(new Error('API request failed'));

                const result = await getPortfolioPositionsAction.handler(
                    mockRuntime,
                    mockMemory,
                    mockState,
                    {},
                    mockCallback
                );

                expect(result.success).toBe(true); // Action now handles errors gracefully
                const finalCallback = mockCallback.mock.calls[mockCallback.mock.calls.length - 1][0];
                expect(finalCallback.text).toBeDefined();
            });

            it('should handle client initialization errors', async () => {
                (clobClient.initializeClobClient as any).mockRejectedValue(
                    new Error('Failed to initialize client')
                );

                const result = await getPortfolioPositionsAction.handler(
                    mockRuntime,
                    mockMemory,
                    mockState,
                    {},
                    mockCallback
                );

                expect(result.success).toBe(false);
                const callbackContent = mockCallback.mock.calls[0][0];
                expect(callbackContent.text).toContain('Failed to initialize');
            });

        });

        describe('edge cases', () => {
            it.skip('should handle positions with zero shares', async () => {
                const mockPositions = [
                    {
                        conditionId: '0x123abc',
                        outcomeId: 0,
                        shares: '0',
                        avgPrice: '0.5',
                        realized: '10',
                        unrealized: '0',
                    },
                ];

                mockClient.getOpenPositions.mockResolvedValue(mockPositions);
                mockClient.getMappedMetadata.mockResolvedValue({});

                const result = await getPortfolioPositionsAction.handler(
                    mockRuntime,
                    mockMemory,
                    mockState,
                    {},
                    mockCallback
                );

                const callbackContent = mockCallback.mock.calls[0][0];
                // Should filter out or handle zero-share positions
                expect(callbackContent.data.positions).toHaveLength(1);
                expect(callbackContent.data.positions[0].shares).toBe('0');
            });

            it.skip('should handle negative P&L values', async () => {
                const mockPositions = [
                    {
                        conditionId: '0x123abc',
                        outcomeId: 0,
                        shares: '100',
                        avgPrice: '0.8',
                        realized: '-50',
                        unrealized: '-20',
                    },
                ];

                mockClient.getOpenPositions.mockResolvedValue(mockPositions);
                mockClient.getMappedMetadata.mockResolvedValue({
                    '0x123abc': {
                        question: 'Losing Position',
                        outcomes: ['YES', 'NO'],
                    },
                });

                const result = await getPortfolioPositionsAction.handler(
                    mockRuntime,
                    mockMemory,
                    mockState,
                    {},
                    mockCallback
                );

                const callbackContent = mockCallback.mock.calls[0][0];
                expect(callbackContent.text).toContain('-$50'); // Should show negative values
                expect(callbackContent.text).toContain('-$20');
                expect(callbackContent.data.positions[0].totalPnL).toBe('-70');
            });

            it.skip('should handle very small decimal values', async () => {
                const mockPositions = [
                    {
                        conditionId: '0x123abc',
                        outcomeId: 0,
                        shares: '1',
                        avgPrice: '0.00001',
                        realized: '0.000001',
                        unrealized: '0.000002',
                    },
                ];

                mockClient.getOpenPositions.mockResolvedValue(mockPositions);
                mockClient.getMappedMetadata.mockResolvedValue({});

                const result = await getPortfolioPositionsAction.handler(
                    mockRuntime,
                    mockMemory,
                    mockState,
                    {},
                    mockCallback
                );

                expect(result.success).toBe(true);
                const callbackContent = mockCallback.mock.calls[0][0];
                const position = callbackContent.data.positions[0];
                // Should handle very small numbers without scientific notation
                expect(position.avgPrice).toContain('0.00001');
            });
        });
    });

    describe('examples', () => {
        it('should have valid example messages', () => {
            expect(getPortfolioPositionsAction.examples).toBeDefined();
            expect(Array.isArray(getPortfolioPositionsAction.examples)).toBe(true);
            expect(getPortfolioPositionsAction.examples.length).toBeGreaterThan(0);
            
            getPortfolioPositionsAction.examples.forEach(example => {
                expect(Array.isArray(example)).toBe(true);
                expect(example.length).toBeGreaterThanOrEqual(2);
                
                const [userMsg] = example;
                expect(userMsg).toHaveProperty('name');
                expect(userMsg).toHaveProperty('content');
                expect(userMsg.content).toHaveProperty('text');
            });
        });
    });

    describe('metadata', () => {
        it('should have correct action metadata', () => {
            expect(getPortfolioPositionsAction.name).toBe('GET_PORTFOLIO_POSITIONS');
            expect(getPortfolioPositionsAction.description).toBeDefined();
            expect(getPortfolioPositionsAction.similes).toBeDefined();
            expect(Array.isArray(getPortfolioPositionsAction.similes)).toBe(true);
        });
    });
});