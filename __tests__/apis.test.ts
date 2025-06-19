import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { readMarketsAction } from '../src/actions/utilites/readMarkets';
import { ClobService } from '../src/services/clobService';
import { createMockRuntime, createMockMessage, createMockState, documentTestResult } from './utils/core-test-utils';
import { HandlerCallback } from '@elizaos/core/v2';
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

         // Execute the action handler and assert the callback
    // Wrap in a try-catch for more robust error handling

    // Execute the action handler

  //  documentTestResult('Run Market Action Test ', mockCallback);
  //  documentTestResult('Run Market Action Test RESPONSE ',mockClobService.fetchMarkets());
   // documentTestResult('Run Market Action Test MESSAGE ', message);

    await readMarketsAction.handler(runtime, message, state, {}, mockCallback, []);

    // Now the callbackResponse should not be null if called correctly.
 expect(callbackResponse).not.toBeNull();
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
