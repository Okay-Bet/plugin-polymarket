import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { readMarketsAction } from '../src/actions/utilites/readMarkets';
import { createMockRuntime, createMockMessage, createMockState } from './utils/core-test-utils';
import { HandlerCallback, logger } from '@elizaos/core/v2';
const apiUrl = "https://gamma-api.polymarket.com/markets";

describe('readMarketsAction', () => {
  // This test simulates the successful API call within the readMarketsAction handler.
  it('should successfully handle markets fetched from ClobService', async () => {
    const runtime = createMockRuntime();
    const message = createMockMessage('Show me Polymarket markets');
    const state = createMockState();    
    let callbackResponse: any = null;    

    afterEach(() => {
      vi.restoreAllMocks();
    });

    beforeEach(() => { callbackResponse = null; });

    const mockCallback: HandlerCallback = (response: any) => {
      return callbackResponse = response;
    };

    // Create a mock ClobService with a mocked fetchMarkets method
    const mockClobService = {
      fetchMarkets: vi.fn().mockResolvedValue({
          success: true,
          markets: [{ url: apiUrl, question: "Will this test pass?", outcomes: [{ name: "Yes", price: "0.5", clobTokenId: "123" }] }], // Simulate a market object
        }),
      };
    
    // Mock the runtime's getService method to return the mock ClobService    
    runtime.getService = vi.fn().mockImplementation((serviceType) => {
      if (serviceType === 'ClobService') {
        return mockClobService;

      }
      return undefined; // Or handle other service types as needed
    });

    // Mock the useModel function on the runtime object    
    runtime.useModel = vi.fn().mockResolvedValue({}); // Or a more appropriate mock value if needed    

    logger.info("Mocked ClobService:", mockClobService);
    logger.info("Mocked runtime.getService:", runtime.getService);

         // Execute the action handler and assert the callback
    // Wrap in a try-catch for more robust error handling
    try {
        await readMarketsAction.handler(runtime, message, state, {}, mockCallback, []);

        logger.info("Callback response after handler:", callbackResponse);

        // Now the callbackResponse should not be null if called correctly.
        expect(callbackResponse).not.toBeNull();
        // Add specific checks on the response content if needed
        expect(callbackResponse.text).toContain("1. \"Will this test pass?\"");
      } catch (error) {
        // If the handler throws, fail the test and log the error
        console.error("Test failed due to handler error:", error);
        throw error; 
      }
  });
});

describe('direct_API_call', () => {
  it('should retrieve contents of apiUrl directly without mocks', async () => {
    const apiUrl = "https://gamma-api.polymarket.com/markets";
    try {
      const response = await fetch(apiUrl);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).not.toBeNull();
      // Add more specific assertions about the data if needed
      console.log("Direct API call successful. Data:", data.toString().substring(0,50));
    } catch (error) {
      console.error("Direct API call failed:", error);
      throw error; // Re-throw the error to fail the test
    }
  });
});
