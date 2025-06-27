import type {
  Content,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
  TestSuite,
  UUID,
} from "@elizaos/core/v2";
import { v4 as uuidv4 } from "uuid";
import { character } from "./character";

export class ClobTestSuite implements TestSuite {
  name = "clob";
  description = "Tests for the clob project";

  tests = [
    {
      name: "Character configuration test",
      fn: async (runtime: IAgentRuntime) => {
        const requiredFields = [
          "name",
          "bio",
          "plugins",
          "system",
          "messageExamples",
        ];
        const missingFields = requiredFields.filter(
          (field) => !(field in character),
        );

        if (missingFields.length > 0) {
          throw new Error(
            `Missing required fields: ${missingFields.join(", ")}`,
          );
        }

        // Additional character property validations
        if (character.name !== "agent") {
          throw new Error(
            `Expected character name to be 'agent', got '${character.name}'`,
          );
        }
        if (!Array.isArray(character.plugins)) {
          throw new Error("Character plugins should be an array");
        }
        if (!character.system) {
          throw new Error("Character system prompt is required");
        }
        if (!Array.isArray(character.bio)) {
          throw new Error("Character bio should be an array");
        }
        if (!Array.isArray(character.messageExamples)) {
          throw new Error("Character message examples should be an array");
        }
      },
    },
    {
      name: "Plugin initialization test",
      fn: async (runtime: IAgentRuntime) => {
        // Test plugin initialization with empty config
        try {
          await runtime.registerPlugin({
            name: "clob",
            description: "A clob plugin for Eliza",
            init: async () => {},
            config: {},
          });
        } catch (error: any) {
          throw new Error(`Failed to register plugin: ${error.message}`);
        }
      },
    },
    {
      name: "Polymarket plugin ready action test",
      fn: async (runtime: IAgentRuntime) => {
        const message: Memory = {
          entityId: uuidv4() as UUID,
          roomId: uuidv4() as UUID,
          content: {
            text: "Is the plugin ready?",
            source: "agent_response",
            actions: [], // No specific action requested in the test message
          },
        };

        const state: State = {
          values: {},
          data: {},
          text: "",
        };
        let responseReceived = false;

        // Test the polymarket plugin started notification action
        try {
          await runtime.processActions(
            message,
            [],
            state,
            async (content: Content) => {
              if (
                content.text ===
                "Polymarket plugin has started and is operational."
              ) {
                responseReceived = true;
              }
              return [];
            },
          );

          if (!responseReceived) {
            throw new Error(
              "Polymarket plugin started notification not received",
            );
          }

          // expect(runtime.processActions).toHaveBeenCalledTimes(1); // Verify it was called
        } catch (error: any) {
          throw new Error(
            `Polymarket plugin started action test failed: ${error.message}`,
          );
        }
      },
    },
    {
      name: "PolymarketService test",
      fn: async (runtime: IAgentRuntime) => {
        // Test service registration and lifecycle
        try {
          const service = runtime.getService("clob");
          if (!service) {
            throw new Error("PolymarketService not found");
          }

          if (
            service.capabilityDescription !==
            "This is a clob service which is attached to the agent through the clob plugin."
          ) {
            throw new Error("Incorrect service capability description");
          }

          await service.stop();
        } catch (error: any) {
          throw new Error(`PolymarketService test failed: ${error.message}`);
        }
      },
    },
    {
      name: "Set username action test",
      fn: async (runtime: IAgentRuntime) => {
        const testUsername = "TestUser";
        const message: Memory = {
          entityId: uuidv4() as UUID,
          roomId: uuidv4() as UUID,
          content: {
            text: `Set my username to ${testUsername}`,
            source: "test",
            actions: [],
          },
        };

        const state: State = {
          values: {},
          data: {},
          text: "",
        };

        let responseReceived = false;
        let expectedResponse = `Username set to ${testUsername}.`;

        try {
          await runtime.processActions(
            message,
            [],
            state,
            async (content: Content) => {
              if (content.text === expectedResponse) {
                responseReceived = true;
              }
              return [];
            },
          );

          if (!responseReceived) {
            throw new Error(
              `Set username action failed. Expected response: "${expectedResponse}"`,
            );
          }

          // Optionally, you can also verify that the username is actually set by calling `getUsernameAction`
          const getUsernameMessage: Memory = {
            entityId: uuidv4() as UUID,
            roomId: uuidv4() as UUID,
            content: {
              text: "What is my username?",
              source: "test",
              actions: [],
            },
          };

          responseReceived = false;
          expectedResponse = `Your username is: ${testUsername}`;

          await runtime.processActions(
            getUsernameMessage,
            [],
            state,
            async (content: Content) => {
              if (content.text === expectedResponse) {
                responseReceived = true;
              }
              return [];
            },
          );

          if (!responseReceived) {
            throw new Error(
              `Get username action failed after setting. Expected response: "${expectedResponse}"`,
            );
          }
        } catch (error: any) {
          throw new Error(`Set username action test failed: ${error.message}`);
        }
      },
    },

    // Add a test for `getUsernameAction` here (similar to the above, but focusing on retrieving the username)
    // You can combine it with the `setUserAction` test as shown above, or create a separate test if desired.
  ];
}

// Export a default instance
export default new ClobTestSuite();
function expect(
  processActions: (
    message: Memory,
    responses: Memory[],
    state?: State,
    callback?: HandlerCallback,
  ) => Promise<void>,
) {
  throw new Error("Function not implemented.");
}
