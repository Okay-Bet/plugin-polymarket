import { Service, IAgentRuntime, logger } from "@elizaos/core/v2";
import { ethers } from "ethers";
import { ClobClient, AssetType } from "@polymarket/clob-client";

export class ClobService extends Service {
  static serviceType = "ClobService";
  private clobClient: ClobClient;

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    // Initialize the ClobClient here, using environment variables
    // Assuming IWallet is now called something else or needs a different import
    logger.info(`Loading ClobService with PK: ${process.env.PK}`);

  }

  async connectWallet(privateKey: string): Promise<void> {
    try {
      if (!privateKey) {
        throw new Error(
          "Private key not provided in environment or function argument.",
        );
      }

      const wallet = new ethers.Wallet(privateKey);
      const chainId = parseInt(process.env.CHAIN_ID || "80001", 10); // Default to 80001
      const host = process.env.CLOB_API_URL || "http://localhost:8080";
      const clobClient = new ClobClient(host, chainId, wallet as any);

      this.clobClient = clobClient;
      logger.info(
        `ClobService wallet connected successfully for address: ${await wallet.getAddress()}`,
      );
    } catch (error: any) {
      logger.error(`Failed to connect wallet: ${error.message}`);
      this.clobClient = null; // Ensure client is null if connection fails
      throw new Error(`Wallet connection error: ${error.message}`);
    }
  }

  static async start(runtime: IAgentRuntime): Promise<ClobService> {
    const service = new ClobService(runtime);
    return service;
  }

  static register(runtime: IAgentRuntime): IAgentRuntime {
    return runtime;
  }

  capabilityDescription =
    "Provides access to the Polymarket CLOB client for trading operations.";

  getClobClient(): ClobClient {
    if (!this.clobClient) {
      throw new Error(
        "ClobClient not initialized. Ensure the wallet is connected. Call connectWallet() if needed.",
      );
    }
    return this.clobClient;
  }

  async updateBalanceAllowance(
    assetType: AssetType,
    tokenId?: string,
  ): Promise<void> {
    try {
      if (!this.clobClient) {
        throw new Error(
          "ClobClient not initialized. Ensure the wallet is connected.",
        );
      }
      const params = { asset_type: assetType };
      if (tokenId) {
        params["token_id"] = tokenId;
      }

      // The updateBalanceAllowance function can only take the above object, or a single string for token ID
      if (tokenId) {
        // Conditional token
        await this.clobClient.updateBalanceAllowance(params);
      } else {
        // Collateral token
        await this.clobClient.updateBalanceAllowance(params);
      }

      logger.info(
        `Successfully updated balance allowance for asset type: ${assetType}, token ID: ${tokenId || "N/A"}`,
      );
    } catch (error: any) {
      logger.error(`Failed to update balance allowance: ${error.message}`);
      throw new Error(`Failed to update balance allowance: ${error.message}`);
    }
  }
  async stop() {
    logger.info("ClobService stopped");
  }
  static async stop(runtime: IAgentRuntime): Promise<void> {
    const service = runtime.getService(ClobService.serviceType);
    if (!service) throw new Error("ClobService not found in runtime for stop");
    await service.stop();
  }
}
