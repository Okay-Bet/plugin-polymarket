import {
  Action,
  IAgentRuntime,
  Memory,
  State,
  Content,
  HandlerCallback,
  logger,
} from "@elizaos/core";

// Action to set the username
export const setUserAction: Action = {
  name: "SET_USERNAME",
  similes: ["USER_NAME_SETTER", "USERNAME_INITIALIZER"],
  description: "Sets the user's username.",
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Set my username to Alice" },
      },
      {
        name: "{{agent}}",
        content: { text: "Username set to Alice." },
      },
    ],
  ],
  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content as Content).text.toLowerCase();
    const includesSet =
      text.includes("set") && text.includes("username") && text.includes("to");
    const includesEdit =
      text.includes("edit") &&
      text.includes("username") &&
      text.includes("make") &&
      text.includes("it");
    return includesSet || includesEdit;
  },
  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[],
  ): Promise<string> => {
    try {
      const content = message.content as Content;
      const text = content.text;
      const match = text.match(
        /(change|set|edit)\s+my\s+username\s+(?:to|and make it)\s+(.+)/i,
      );
      if (match && match[2]) {
        const newUsername = match[2].trim(); // Extract the username (group 2 in the regex)
        setUsername(newUsername);
        const responseText = `Username set to ${newUsername}.`;
        await callback({ text: responseText });
        return responseText;
      } else {
        return "Please specify a username after 'to'. Example: Set my username to John";
      }
    } catch (error) {
      logger.error(error);
      return `Error setting username: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },
};

// Action to get the current username (primarily for testing/debugging)
export const getUsernameAction: Action = {
  name: "GET_USERNAME",
  similes: ["USERNAME_GETTER", "USERNAME_RETRIEVER"],
  description: "Retrieves the current username.",
  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "What is my username?" },
      },
      {
        name: "{{agent}}",
        content: { text: "Your username is: User" }, // Replace "User" with actual default
      },
    ],
  ],
  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content as Content).text.toLowerCase();
    return (
      text.includes("what") &&
      text.includes("is") &&
      text.includes("my") &&
      text.includes("username")
    );
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
      const currentUsername = getDefaultUsername();
      const responseText = `Your username is: ${currentUsername}`;
      await callback({ text: responseText });
      return responseText;
    } catch (error) {
      logger.error(error);
      return `Error getting username: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  },
};

const USERNAME_KEY = "polymarket_username";

export const getDefaultUsername = (): string => {
  const storedUsername = localStorage.getItem(USERNAME_KEY);
  return storedUsername || "User";
};

export const setUsername = (username: string): void => {
  if (username === null || username === undefined) {
    localStorage.removeItem(USERNAME_KEY); // Remove the key if null or undefined
  } else {
    localStorage.setItem(USERNAME_KEY, username);
  }
};
