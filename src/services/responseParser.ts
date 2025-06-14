import { Service, IAgentRuntime, logger } from "@elizaos/core";

export class ResponseParserService extends Service {
    async stop(): Promise<void> {
        // Add any necessary cleanup logic here, if applicable.
    }
    static async start(runtime: IAgentRuntime): Promise<ResponseParserService> {
        const service = new ResponseParserService(runtime);
        return service;
    }

    static serviceType = "ResponseParserService";

    static register(runtime: IAgentRuntime): IAgentRuntime {
        return runtime;
    }

    capabilityDescription = "Provides methods to parse LLM responses as JSON or text.";

    constructor(protected runtime: IAgentRuntime) {
        super(runtime);
    }

    async processLLMResponse(responseText: string): Promise<string | object> {
        try {
          const jsonResult = JSON.parse(responseText);
 logger.info("Successfully parsed response as JSON:", jsonResult);
          return jsonResult; // If successful, return the parsed JSON object
        } catch (jsonError) {
 logger.debug("JSON parsing failed:", jsonError);
 logger.warn("Failed to parse response as JSON. Returning raw text.");
          // Consider returning a consistent structure, like an object with a 'text' property
          return responseText;
        }
    }
}