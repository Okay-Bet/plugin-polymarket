import {
  logger,
  Plugin,
  type IAgentRuntime,
  type Project,
  type ProjectAgent,
} from "@elizaos/core/v2";
import character from "./character";
import pluginPolymarket from "./plugin";
import googleGenAIPlugin from "@elizaos/plugin-google-genai";

/**
 * Represents the default character (Eliza) with her specific attributes and behaviors.
 * Eliza responds to messages relevant to the community manager, offers help when asked, and stays focused on her job.
 * She interacts with users in a concise, direct, and helpful manner, using humor and silence effectively.
 * Eliza's responses are geared towards resolving issues, offering guidance, and maintaining a positive community environment.
 */

const initCharacter = ({ runtime }: { runtime: IAgentRuntime }) => {
  logger.info("Initializing character");
  logger.info("Name: ", character.name);
};

export const projectAgent: ProjectAgent = {
  character: character,
  init: async (runtime: IAgentRuntime) => await initCharacter({ runtime }),
  plugins: [
    pluginPolymarket,
    ...(process.env.GOOGLE_GENAI_API_KEY
      ? [googleGenAIPlugin as unknown as Plugin]
      : []),
  ],
};
const project: Project = {
  agents: [projectAgent],
};

export default project;
