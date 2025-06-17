import { describe, expect, it, vi, afterEach } from 'vitest';
import { readMarketsAction } from '../src/actions/utilites/readMarkets';
import GammaService from '../src/services/gammaService';
import { createMockRuntime, createMockMessage, createMockState, documentTestResult } from './utils/core-test-utils';
import { HandlerCallback } from '@elizaos/core/v2';
const apiUrl = "https://gamma-api.polymarket.com/markets";

describe('readMarketsAction', () => {
  // This test simulates the successful API call within the readMarketsAction handler.
  it('should successfully handle markets fetched from GammaService', async () => {
    const runtime = createMockRuntime();
    const message = createMockMessage('Show me Polymarket markets');
    const state = createMockState();
    let callbackResponse: any = null;
    
    afterEach(() => {
      vi.restoreAllMocks();
    });

    const mockCallback: HandlerCallback = (response: any) => {
      return callbackResponse = response;
    };

    // Mock GammaService.fetchMarkets to simulate a successful response (adjust as needed)
  const mockFetchMarkets = vi.fn().mockResolvedValue({
    success: true,
    markets: [{ url: apiUrl, question: "Will this test pass?", outcomes: [{ name: "Yes", price: "0.5", clobTokenId: "123" }] }], // Simulate a market object containing the apiUrl
  });
  
  // Set up the mock directly on the runtime's gammaService which breaks everything and needs to be removed.
  (runtime as any).gammaService.fetchMarkets = mockFetchMarkets;
  
    // Mock the useModel function on the runtime object
    runtime.useModel = vi.fn().mockResolvedValue({}); // Or a more appropriate mock value if needed

    // Execute the action handler
    await readMarketsAction.handler(runtime, message, state, {}, mockCallback, []);

    // Assert that the callback was called with a non-null response
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
      console.log("Direct API call successful. Data:", data);
    } catch (error) {
      console.error("Direct API call failed:", error);
      throw error; // Re-throw the error to fail the test
    }
  });
});
