import {
  type IAgentRuntime,
  type Action,
  type Memory,
  type State,
  type Content,
  type HandlerCallback,
} from '@elizaos/core';
import { GammaService } from '../../services/gammaService';

export const sellSharesAction: Action = {
  name: 'SELL_SHARES',
  similes: ["SELL_SHARES"],
  description: 'Sells x number shares in a specified Polymarket market.',
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: 'Sell 5 shares of "Yes" in market 123' },
      },
      {
        name: "{{agent}}",
        content: { text: 'Attempting to sell 5 shares of "Yes" in market 123' },
      },
    ],
  ],
  validate: async (params: any) => {
    return params.marketId && params.outcome && typeof params.quantity === 'number' && params.quantity > 0;
  },
  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[],
  ): Promise<string> => {
    try {
      const { marketId, outcome, quantity } = _options;
      const responseText = `Successfully sold ${quantity} shares of "${outcome}" in market ${marketId}. (Simulated)`;
      await callback({ text: responseText });
      return responseText;
    } catch (error) {
      return `Error selling shares: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  }
};
