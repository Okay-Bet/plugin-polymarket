import {
  type IAgentRuntime,
  type Memory,
  type State,
  type Action,
  type ActionResult,
  type Content,
  type HandlerCallback,
  logger,
} from "@elizaos/core";
import { MarketSyncService } from "../services/MarketSyncService";

export const syncMarketsAction: Action = {
  name: "SYNC_POLYMARKET_MARKETS",
  description: "Manually trigger a sync of Polymarket markets, optionally with a search term",
  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "sync F1 markets" },
      },
      {
        name: "{{assistant}}",
        content: { text: "I'll sync F1 markets from Polymarket." },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "update the market database" },
      },
      {
        name: "{{assistant}}",
        content: { text: "Starting market database sync..." },
      },
    ],
  ],
  
  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    const text = (message.content.text || "").toLowerCase();
    const syncKeywords = ["sync", "update", "refresh", "fetch", "reload"];
    const marketKeywords = ["market", "markets", "database"];
    
    const hasSyncKeyword = syncKeywords.some(keyword => text.includes(keyword));
    const hasMarketKeyword = marketKeywords.some(keyword => text.includes(keyword));
    
    return hasSyncKeyword && hasMarketKeyword;
  },

  handler: async (
    runtime: IAgentRuntime, 
    message: Memory, 
    state?: State,
    options?: Record<string, any>,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      logger.info("[syncMarketsAction] Starting manual market sync");
      
      const text = message.content.text || "";
      
      // Extract search term if any
      let searchTerm = "";
      const match = text.match(/sync\s+(.+?)\s+markets?/i);
      if (match) {
        searchTerm = match[1].trim();
      }
      
      // Get the sync service
      const syncService = runtime.getService("polymarket-sync") as MarketSyncService;
      
      if (!syncService) {
        throw new Error("Market sync service not available");
      }
      
      const responseContent: Content = {
        text: searchTerm 
          ? `🔄 Starting sync for ${searchTerm.toUpperCase()} markets... This may take a moment.`
          : `🔄 Starting full market database sync... This may take a moment.`,
        action: "SYNC_POLYMARKET_MARKETS",
        data: {
          searchTerm,
          status: "started",
        },
      };
      
      if (callback) {
        await callback(responseContent);
      }
      
      // Trigger sync and get results
      const syncResults = await syncService.performSync("manual", searchTerm);
      
      // Get sync status for the response
      const syncStatus = await syncService.getSyncStatus();
      
      // Format duration
      const durationSeconds = (syncResults.duration / 1000).toFixed(1);
      
      const successContent: Content = {
        text: searchTerm
          ? `✅ Successfully synced ${searchTerm.toUpperCase()} markets!\n\n📊 **Sync Results:**\n• Markets found: ${syncResults.totalMarkets}\n• Markets synced: ${syncResults.syncedCount}\n• Markets skipped: ${syncResults.skippedCount} (expired/invalid)\n• Time taken: ${durationSeconds} seconds\n\nTry searching for ${searchTerm} markets now!`
          : `✅ Market database sync completed!\n\n📊 **Sync Results:**\n• Total markets fetched: ${syncResults.totalMarkets}\n• Successfully synced: ${syncResults.syncedCount}\n• Skipped (expired/invalid): ${syncResults.skippedCount}\n• Time taken: ${durationSeconds} seconds\n\n⏰ **Schedule:**\n• Last sync: Just now\n• Next automatic sync: ${syncStatus.nextSyncTime ? syncStatus.nextSyncTime.toLocaleString() : 'In 24 hours'}\n• Sync interval: Daily (24 hours)\n\nFresh markets are now available for searching!`,
        action: "SYNC_POLYMARKET_MARKETS",
        data: {
          searchTerm,
          status: "completed",
          syncedCount: syncResults.syncedCount,
          skippedCount: syncResults.skippedCount,
          totalMarkets: syncResults.totalMarkets,
          duration: syncResults.duration,
          lastSyncTime: syncStatus.lastSyncTime,
          nextSyncTime: syncStatus.nextSyncTime,
          syncInterval: syncStatus.syncInterval,
        },
      };
      
      if (callback) {
        await callback(successContent);
      }
      
      return {
        success: true,
        data: successContent.data || {},
      };
      
    } catch (error) {
      logger.error(`[syncMarketsAction] Error syncing markets: ${error}`);
      
      const errorContent: Content = {
        text: `❌ Failed to sync markets: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "SYNC_POLYMARKET_MARKETS",
        data: {
          error: error instanceof Error ? error.message : "Unknown error",
          status: "failed",
        },
      };
      
      if (callback) {
        await callback(errorContent);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sync markets",
        data: errorContent.data || {},
      };
    }
  },
};