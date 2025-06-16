import { Service, IAgentRuntime, logger } from "@elizaos/core";
import { ethers } from "ethers";
import { Chain, ClobClient, type IWallet } from "@polymarket/clob-client";

export class ClobService extends Service {
  static serviceType = "ClobService";
  private clobClient: ClobClient;

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    // Initialize the ClobClient here, using environment variables
    const wallet = new ethers.Wallet(`${process.env.PK}`) as unknown as IWallet;
    const chainId = parseInt(`${process.env.CHAIN_ID || Chain.AMOY}`) as Chain;
    const host = process.env.CLOB_API_URL || "http://localhost:8080";

    this.clobClient = new ClobClient(host, chainId, wallet); // Provide the wallet here
  }

  static async start(runtime: IAgentRuntime): Promise<ClobService> {
    const service = new ClobService(runtime);
    return service;
  }

  static register(runtime: IAgentRuntime): IAgentRuntime {
    return runtime;
  }

  get capabilityDescription() {
    return "Provides access to the Polymarket CLOB client for trading operations.";
  }

  async stop() {
    logger.info("ClobService stopped");
  }

  getClobClient(): ClobClient {
    return this.clobClient;
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    const service = runtime.getService(ClobService.serviceType);
    if (!service) throw new Error("ClobService not found in runtime for stop");
    await service.stop();
  }
}