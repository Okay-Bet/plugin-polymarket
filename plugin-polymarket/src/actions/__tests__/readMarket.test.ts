import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readMarkets } from '../readMarkets';
import { polymarketService } from '../../services/polymarketService';
import type { IAgentRuntime, Memory, State, Content, UUID } from '@elizaos/core'; // Import UUID and Content
import { ReadMarketsActionContent, PolymarketMarket } from '../../types';

// Mock polymarketService
vi.mock('../../services/polymarketService', () => ({
  polymarketService: {
    fetchMarkets: vi.fn(),
  },
}));

// Mock elizaLogger from @elizaos/core
vi.mock('@elizaos/core', async (importOriginal) => {
    const original = await importOriginal<typeof import('@elizaos/core')>();
    return {
        ...original,
        elizaLogger: { // Ensure all methods of elizaLogger are mocked if used
            log: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            info: vi.fn(),
            debug: vi.fn(),
        },
    };
});

describe('readMarkets Action', () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: State;

  // Helper to create a valid UUID
  const createMockUUID = (): UUID => '123e4567-e89b-12d3-a456-426614174000' as UUID;

  beforeEach(() => {
    vi.resetAllMocks(); // Resets all mocks

    // Provide a more complete mock for State
    mockState = {
        topics: ['test topic'],
        recentMessages: "test",
        recentPostInteractions: [],
        postDirections: 'Be friendly',
        agentName: 'TestAgent',
        bio: '',
        lore: '',
        messageDirections: '',
        roomId: 'ads' as UUID,
        actors: '',
        recentMessagesData: []
    };

    mockRuntime = {
      agentId: createMockUUID(),
      // Ensure composeState returns a fully compliant State object
      composeState: vi.fn().mockResolvedValue(mockState),
      // Add other IAgentRuntime methods if they are called and need mocking
      // For example, if runtime.getMemory is used:
      // getMemory: vi.fn(),
      // send: vi.fn(),
    } as unknown as IAgentRuntime;

    mockMessage = {
        id: '123' as UUID,
        content: { text: 'Please tweet something' },
        userId: '123' as UUID,
        agentId: '123' as UUID,
        roomId: '123' as UUID
    };
    
    // Update mockState to include the fully formed mockMessage
    mockState.messages = [mockMessage];
  });

  describe('validate function', () => {
    const runValidation = (text: string) => {
        // Create a new message for each validation run to avoid shared state issues
        const messageWithContent = {
            ...mockMessage, // Spread the base mockMessage
            content: { text } as ReadMarketsActionContent as Content, // Override content
        };
        return readMarkets.validate!(mockRuntime, messageWithContent, mockState);
    };

    it('should return true for valid polymarket query', async () => {
      expect(await runValidation('show me polymarket markets')).toBe(true);
      expect(await runValidation('what are the prediction market odds?')).toBe(true);
      expect(await runValidation('get polymarket data about something')).toBe(true);
      expect(await runValidation('find markets for crypto')).toBe(true);
    });

    it('should return false for irrelevant query', async () => {
      expect(await runValidation('hello world')).toBe(false);
      expect(await runValidation('what is the weather?')).toBe(false);
    });

     it('should return false if action keywords are missing', async () => {
      expect(await runValidation('polymarket news')).toBe(false);
    });

    it('should return false if context keywords are missing', async () => {
      expect(await runValidation('show me some stuff')).toBe(false);
    });

    it('should handle content missing .text property gracefully', async () => {
        // This test is for when content.text would cause a runtime error,
        // which should be caught by the try/catch in validate.
        const invalidContent = { someOtherProp: 'test' } as unknown as Content; // This content lacks 'text'
        const invalidMessage: Memory = {
             ...mockMessage,
             content: invalidContent,
        };
        expect(await readMarkets.validate!(mockRuntime, invalidMessage, mockState)).toBe(false);
    });
  });

  describe('handler function', () => {
    it('should fetch and format markets successfully with a query and limit', async () => {
      const currentMessage: Memory = {
          ...mockMessage,
          content: { text: 'show 3 markets on Polymarket about "AI safety"' } as Content
      };
      const fakeMarkets: PolymarketMarket[] = [
        { id: '1', slug: 'ai-safety-market-1', question: 'AI safety market 1?', outcomes: [{clobTokenId: 'o1', name: 'Yes', price: 0.7 }, {clobTokenId: 'o1-no', name: 'No', price: 0.3 }], active: true, url: '', volume: 0, liquidity: 0, endDate: '', description: '' },
        { id: '2', slug: 'ai-safety-market-2', question: 'AI safety market 2?', outcomes: [{clobTokenId: 'o2', name: 'No', price: 0.3 }], active: true, url: '', volume: 0, liquidity: 0, endDate: '', description: '' },
      ];
      (polymarketService.fetchMarkets as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, markets: fakeMarkets });

      const result = await readMarkets.handler!(mockRuntime, currentMessage, mockState);

      expect(mockRuntime.composeState).toHaveBeenCalledWith(currentMessage);
      expect(polymarketService.fetchMarkets).toHaveBeenCalledWith({
        limit: 3,
        activeOnly: true,
        query: 'AI safety',
      });
      expect(result).toContain('Here are the top 2 prediction markets about "AI safety" on Polymarket:');
      expect(result).toContain('1. "AI safety market 1?" - Yes: $0.70, No: $0.30');
      expect(result).toContain('2. "AI safety market 2?" - No: $0.30');
    });

    it('should use default limit if not specified', async () => {
      const currentMessage: Memory = {
          ...mockMessage,
          content: { text: 'what polymarket markets about "elections"?' } as Content
      };
       (polymarketService.fetchMarkets as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, markets: [] });
      await readMarkets.handler!(mockRuntime, currentMessage, mockState);
      expect(polymarketService.fetchMarkets).toHaveBeenCalledWith(expect.objectContaining({
        limit: 5, // Default limit
        query: 'elections',
      }));
    });

    it('should handle "all markets" to set activeOnly to false', async () => {
      const currentMessage: Memory = {
          ...mockMessage,
          content: { text: 'list all markets from polymarket' } as Content
      };
      (polymarketService.fetchMarkets as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, markets: [] });
      await readMarkets.handler!(mockRuntime, currentMessage, mockState);
      expect(polymarketService.fetchMarkets).toHaveBeenCalledWith(expect.objectContaining({
        activeOnly: false,
      }));
    });

    it('should handle no markets found', async () => {
      const currentMessage: Memory = {
          ...mockMessage,
          content: { text: 'find polymarket markets about "obscure topic"' } as Content
      };
      (polymarketService.fetchMarkets as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, markets: [] });

      const result = await readMarkets.handler!(mockRuntime, currentMessage, mockState);
      expect(result).toBe(`Sorry, I couldn't find any prediction markets about "obscure topic".`);
    });

    it('should handle service failure', async () => {
      const currentMessage: Memory = {
          ...mockMessage,
          content: { text: 'show polymarket markets' } as Content
      };
      (polymarketService.fetchMarkets as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: 'Service unavailable' });

      const result = await readMarkets.handler!(mockRuntime, currentMessage, mockState);
      expect(result).toBe("Sorry, I couldn't find any prediction markets. Service unavailable");
    });

    it('should handle exceptions during processing', async () => {
      const currentMessage: Memory = {
          ...mockMessage,
          content: { text: 'show polymarket markets' } as Content
      };
      (polymarketService.fetchMarkets as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Big boom'));
      const result = await readMarkets.handler!(mockRuntime, currentMessage, mockState);
      expect(result).toBe('Sorry, there was an error fetching prediction markets: Big boom');
    });
  });
});