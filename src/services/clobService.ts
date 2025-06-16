import { Service, IAgentRuntime, logger } from "@elizaos/core";
import { ethers } from "ethers";
import { Chain, ClobClient } from "@polymarket/clob-client";

export class ClobService extends Service {
  static serviceType = "ClobService";
  private clobClient: ClobClient;

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    // Initialize the ClobClient here, using environment variables
    // Assuming IWallet is now called something else or needs a different import
    logger.info(`Loading ClobService with PK: ${process.env.PK}`);
    this.wallet = null;
    // Assuming AMOY is renamed or needs a different way to access.  Replace with the correct value.
    const chainId = parseInt(`${process.env.CHAIN_ID || 80001}`); // Using a numeric chain ID
    const host = process.env.CLOB_API_URL || "http://localhost:8080";

    this.chainId = chainId;
    this.host = host;
    this.clobClient = null; // Initialize as null, to be created upon wallet connection
  }

  private wallet: ethers.Wallet | null;
  private chainId: number;
  private host: string;

  async connectWallet(privateKey: string): Promise<void> {
    try {
      this.wallet = new ethers.Wallet(privateKey);
      this.clobClient = new ClobClient(this.host, this.chainId, this.wallet);
      logger.info("ClobService wallet connected successfully.");
    } catch (error: any) {
      logger.error(`Failed to connect wallet: ${error.message}`);
      throw new Error(
        `Invalid private key or connection error: ${error.message}`,
      );
    }
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
    if (!this.clobClient) {
      throw new Error(
        "ClobClient not initialized. Please connect a wallet first.",
      );
    }
    return this.clobClient!;
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    const service = runtime.getService(ClobService.serviceType);
    if (!service) throw new Error("ClobService not found in runtime for stop");
    await service.stop();
  }
}
