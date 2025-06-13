import type { Content, IAgentRuntime, Memory, State, TestSuite, UUID } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { character } from './index';

export class StarterTestSuite implements TestSuite {
  name = 'starter';
  description = 'Tests for the starter project';

  tests = [
    {
      name: 'Character configuration test',
      fn: async (runtime: IAgentRuntime) => {
        const requiredFields = ['name', 'bio', 'plugins', 'system', 'messageExamples'];
        const missingFields = requiredFields.filter((field) => !(field in character));

        if (missingFields.length > 0) {
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Additional character property validations
        if (character.name !== 'polydawg') {
          throw new Error(`Expected character name to be 'polydawg', got '${character.name}'`);
        }
        if (!Array.isArray(character.plugins)) {
          throw new Error('Character plugins should be an array');
        }
        if (!character.system) {
          throw new Error('Character system prompt is required');
        }
        if (!Array.isArray(character.bio)) {
          throw new Error('Character bio should be an array');
        }
        if (!Array.isArray(character.messageExamples)) {
          throw new Error('Character message examples should be an array');
        }
      },
    },
    {
      name: 'Plugin initialization test',
      fn: async (runtime: IAgentRuntime) => {
        // Test plugin initialization with empty config
        try {
          await runtime.registerPlugin({
            name: 'starter',
            description: 'A starter plugin for Eliza',
            init: async () => {},
            config: {},
          });
        } catch (error) {
          throw new Error(`Failed to register plugin: ${error.message}`);
        }
      },
    },
    {
      name: 'Polymarket plugin ready action test',
      fn: async (runtime: IAgentRuntime) => {
        const message: Memory = {
          entityId: uuidv4() as UUID,
          roomId: uuidv4() as UUID,
          content: {
            text: 'Is the plugin ready?',
            source: 'test',
            actions: [], // No specific action requested in the test message
          },
        };

        const state: State = {
          values: {},
          data: {},
          text: '',
        };
        let responseReceived = false;

        // Test the hello world action
        try {
          await runtime.processActions(message, [], state, async (content: Content) => {
            if (content.text === 'Polymarket plugin has started and is operational.') {
              responseReceived = true;
            }
            return [];
          });
  
          if (!responseReceived) {
            throw new Error('Polymarket plugin started notification not received');
          }
        } catch (error) {
          throw new Error(`Polymarket plugin started action test failed: ${error.message}`);
        }
      },
      },
    {
      name: 'Starter service test',
      fn: async (runtime: IAgentRuntime) => {
        // Test service registration and lifecycle
        try {
          const service = runtime.getService('starter');
          if (!service) {
            throw new Error('Starter service not found');
          }

          if (
            service.capabilityDescription !==
            'This is a starter service which is attached to the agent through the starter plugin.'
          ) {
            throw new Error('Incorrect service capability description');
          }

          await service.stop();
        } catch (error) {
          throw new Error(`Starter service test failed: ${error.message}`);
        }
      },
    }
  ];
}

// Export a default instance
export default new StarterTestSuite();
