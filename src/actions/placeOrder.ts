import {
  type Action,
  type ActionResult,
  type Content,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from "@elizaos/core";
import { callLLMWithTimeout } from "../utils/llmHelpers";
import { initializeClobClient } from "../utils/clobClient";
import { orderTemplate } from "../templates";
import { OrderSide, OrderType } from "../types";
import {
  contentToActionResult,
  createErrorResult,
} from "../utils/actionHelpers";
import {
  checkUSDCBalance,
  checkPolymarketBalance,
  formatBalanceInfo,
  getMaxPositionSize,
} from "../utils/balanceChecker";
import { findMarketByName } from "../utils/marketLookup";
import { ClobClient, Side } from "@polymarket/clob-client";

interface PlaceOrderParams {
  tokenId: string;
  side: string;
  price: number;
  size: number;
  orderType?: string;
  feeRateBps?: string;
  marketName?: string;
  outcome?: string; // YES/NO for outcome-based trading
}

/**
 * Place order action for Polymarket
 * Creates and places both limit and market orders
 */
export const placeOrderAction: Action = {
  name: "PLACE_ORDER",
  similes: [
    "CREATE_ORDER",
    "PLACE_ORDER",
    "BUY_TOKEN",
    "SELL_TOKEN",
    "LIMIT_ORDER",
    "MARKET_ORDER",
    "TRADE",
    "ORDER",
    "BUY",
    "SELL",
    "PURCHASE",
    "PLACE_BUY",
    "PLACE_SELL",
    "CREATE_BUY_ORDER",
    "CREATE_SELL_ORDER",
    "SUBMIT_ORDER",
    "EXECUTE_ORDER",
    "MAKE_ORDER",
    "PLACE_TRADE",
  ],
  description: "Create and place limit or market orders on Polymarket",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ): Promise<boolean> => {
    logger.info(`[placeOrderAction] Validate called for message: "${message.content?.text}"`);

    const messageText = message.content?.text?.toLowerCase() || "";
    
    // Check if the message actually relates to placing orders/buying
    const buyKeywords = [
      "buy",
      "purchase",
      "place order",
      "bet",
      "invest",
      "acquire",
      "long",
      "take position",
      "get some",
      "want to buy",
      "bid"
    ];
    
    const hasBuyIntent = buyKeywords.some(keyword => messageText.includes(keyword));
    
    if (!hasBuyIntent) {
      logger.info("[placeOrderAction] No buy/order keywords found");
      return false;
    }

    const clobApiUrl = runtime.getSetting("CLOB_API_URL");

    if (!clobApiUrl) {
      logger.warn(`[placeOrderAction] CLOB_API_URL is required but not provided`);
      return false;
    }

    logger.info("[placeOrderAction] Validation passed");
    return true;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    logger.info("[placeOrderAction] Handler called!");

    const clobApiUrl = runtime.getSetting("CLOB_API_URL");

    if (!clobApiUrl) {
      const errorMessage = "CLOB_API_URL is required in configuration.";
      logger.error(`[placeOrderAction] Configuration error: ${errorMessage}`);
      const errorContent: Content = {
        text: errorMessage,
        actions: ["PLACE_ORDER"],
        data: { error: errorMessage },
      };

      if (callback) {
        await callback(errorContent);
      }
      return createErrorResult(errorMessage);
    }

    let tokenId: string;
    let side: string;
    let price: number;
    let size: number;
    let orderType: string = "GTC"; // Default to Good Till Cancelled
    let feeRateBps: string = "0"; // Default fee

    try {
      // Use LLM to extract parameters
      const llmResult = await callLLMWithTimeout<
        PlaceOrderParams & { error?: string }
      >(runtime, state, orderTemplate, "placeOrderAction");

      logger.info(`[placeOrderAction] LLM result: ${JSON.stringify(llmResult)}`);

      if (llmResult?.error) {
        return createErrorResult("Required order parameters not found");
      }

      tokenId = llmResult?.tokenId || "";
      side = llmResult?.side?.toUpperCase() || "";
      price = llmResult?.price || 0;
      size = llmResult?.size || 1; // Default to 1 share if not specified
      orderType =
        llmResult?.orderType?.toLowerCase() || (price > 0 ? "limit" : "market");
      feeRateBps = llmResult?.feeRateBps || "0";

      // Convert order types to CLOB client format
      if (orderType === "limit") {
        orderType = "GTC"; // Good Till Cancelled
      } else {
        orderType = "FOK"; // Fill or Kill for non-limit orders
        // For market orders, we need to get the current market price
        if (price <= 0) {
          // Flag to fetch actual market price later
          price = -1;
        }
      }

      // Handle market name lookup - try to resolve to token ID
      if (
        (tokenId === "MARKET_NAME_LOOKUP" || !tokenId || tokenId.length < 10) &&
        llmResult?.marketName
      ) {
        logger.info(`[placeOrderAction] Market name lookup requested: ${llmResult.marketName}`);

        try {
          const marketResult = await findMarketByName(
            runtime,
            llmResult.marketName,
          );

          if (!marketResult) {
            const errorContent: Content = {
              text: `❌ **Market not found: "${llmResult.marketName}"**

              I couldn't find an active market matching that name.

              **Please try:**
              1. "Show me open markets" to see available markets
              2. Be more specific with the market name
              3. Use quotes around the exact market name

              **Example:**
              - "Show me open markets"
              - "Buy YES in 'Macron out in 2025?'" 
              - "Trade on the Chiefs vs Raiders market"`,
              actions: ["POLYMARKET_GET_OPEN_MARKETS"],
              data: {
                error: "Market not found",
                marketName: llmResult.marketName,
              },
            };

            if (callback) {
              await callback(errorContent);
            }
            return contentToActionResult(errorContent);
          }

          // Determine which token to use based on outcome (YES/NO)
          const outcome =
            llmResult.outcome?.toUpperCase() || side.toUpperCase() === "BUY"
              ? "YES"
              : "NO";
          const targetToken = marketResult.tokens.find(
            (t) => t.outcome.toUpperCase() === outcome,
          );

          if (!targetToken) {
            const availableOutcomes = marketResult.tokens
              .map((t) => t.outcome)
              .join(", ");
            const errorContent: Content = {
              text: `❌ **Outcome not found in market**

              Market: "${marketResult.market.question}"
              Available outcomes: ${availableOutcomes}
              Requested outcome: ${outcome}

              **Please specify:**
              - "Buy YES in [market name]"
              - "Buy NO in [market name]"
              - Or use the exact outcome names listed above`,
              actions: [],
              data: {
                error: "Outcome not found",
                market: marketResult.market,
                availableOutcomes: marketResult.tokens.map((t) => t.outcome),
                requestedOutcome: outcome,
              },
            };

            if (callback) {
              await callback(errorContent);
            }
            return contentToActionResult(errorContent);
          }

          // Success! Update tokenId with resolved token
          tokenId = targetToken.token_id;
          logger.info(`[placeOrderAction] Resolved "${llmResult.marketName}" -> ${outcome} -> ${tokenId.slice(0, 12)}...`);

          // Show market resolution to user
          if (callback) {
            const resolutionContent: Content = {
              text: `✅ **Market Resolved**

              **Market**: ${marketResult.market.question}
              **Outcome**: ${targetToken.outcome}
              **Token ID**: ${tokenId.slice(0, 12)}...

              Proceeding with order verification...`,
              actions: [],
              data: {
                marketResolution: {
                  market: marketResult.market,
                  selectedToken: targetToken,
                  resolvedTokenId: tokenId,
                },
              },
            };
            await callback(resolutionContent);
          }
        } catch (lookupError) {
          logger.error(`[placeOrderAction] Market lookup failed: ${lookupError}`);
          const errorContent: Content = {
            text: `❌ **Market lookup failed**

            Error finding market: "${llmResult.marketName}"

            This could be due to:
            • Database connectivity issues
            • Market not synchronized
            • Invalid market name

            **Please try:**
            - "Show me open markets" to browse available markets
            - Use more specific market names
            - Check spelling and try again`,
            actions: ["POLYMARKET_GET_OPEN_MARKETS"],
            data: {
              error: "Market lookup failed",
              marketName: llmResult.marketName,
              lookupError:
                lookupError instanceof Error
                  ? lookupError.message
                  : "Unknown error",
            },
          };

          if (callback) {
            await callback(errorContent);
          }
          return createErrorResult("Market lookup failed");
        }
      }

      // Check if tokenId looks like a condition ID (0x... format)
      if (tokenId && tokenId.startsWith('0x') && tokenId.length === 66) {
        logger.info(`[placeOrderAction] Detected condition ID: ${tokenId}, fetching token IDs from Gamma API`);
        
        try {
          // Fetch market data using condition ID
          const gammaUrl = `https://gamma-api.polymarket.com/markets?active=true&condition_ids=${tokenId}`;
          const gammaResponse = await fetch(gammaUrl);
          
          if (!gammaResponse.ok) {
            throw new Error(`Gamma API returned ${gammaResponse.status}`);
          }
          
          const gammaData = await gammaResponse.json() as any[];
          
          if (!gammaData || gammaData.length === 0) {
            const errorContent: Content = {
              text: `❌ **Market not found for condition ID**
              
              Condition ID: ${tokenId}

              This market may be:
              • Inactive or closed
              • Not yet synced
              • Invalid condition ID

              Please try:
              - "Show me active markets" to browse available markets
              - Use the GET_MARKET_DATA action with this condition ID to verify it exists`,
              actions: [],
              data: {
                error: "Market not found",
                conditionId: tokenId,
              },
            };
            
            if (callback) {
              await callback(errorContent);
            }
            return createErrorResult("Market not found for condition ID");
          }
          
          const market = gammaData[0];
          
          // Parse clobTokenIds
          let clobTokenIds: string[] = [];
          try {
            clobTokenIds = JSON.parse(market.clobTokenIds || '[]');
          } catch (e) {
            logger.error(`[placeOrderAction] Failed to parse clobTokenIds: ${e}`);
          }
          
          if (clobTokenIds.length < 2) {
            const errorContent: Content = {
              text: `❌ **Token IDs not available for this market**
              
              Market: ${market.question}
              Condition ID: ${tokenId}

              This market may not have trading tokens configured yet.`,
              actions: [],
              data: {
                error: "Token IDs not found",
                market: market,
              },
            };
            
            if (callback) {
              await callback(errorContent);
            }
            return createErrorResult("Token IDs not available for market");
          }
          
          // Determine which token to use based on outcome
          const outcome = llmResult?.outcome?.toUpperCase() || (side === "BUY" ? "YES" : "NO");
          
          // Parse outcomes to determine token mapping
          let outcomes: string[] = [];
          try {
            outcomes = JSON.parse(market.outcomes || '["Yes", "No"]');
          } catch (e) {
            outcomes = ["Yes", "No"];
          }
          
          // Find the index of the desired outcome
          const outcomeIndex = outcomes.findIndex(o => o.toUpperCase() === outcome.toUpperCase());
          
          if (outcomeIndex === -1 || outcomeIndex >= clobTokenIds.length) {
            const errorContent: Content = {
              text: `❌ **Invalid outcome for market**
              
              Market: ${market.question}
              Available outcomes: ${outcomes.join(", ")}
              Requested outcome: ${outcome}

              Please specify YES or NO (or the exact outcome name).`,
              actions: [],
              data: {
                error: "Invalid outcome",
                market: market,
                availableOutcomes: outcomes,
                requestedOutcome: outcome,
              },
            };
            
            if (callback) {
              await callback(errorContent);
            }
            return createErrorResult("Invalid outcome for market");
          }
          
          // Get the correct token ID
          const originalTokenId = tokenId;
          tokenId = clobTokenIds[outcomeIndex];
          
          logger.info(`[placeOrderAction] Resolved condition ID ${originalTokenId} -> ${outcome} -> ${tokenId}`);
          
          // Log resolution internally
          logger.info(`[placeOrderAction] Resolved condition ID ${originalTokenId} to token ${tokenId} for outcome ${outcome}`);
          
        } catch (conditionLookupError) {
          logger.error(`[placeOrderAction] Condition ID lookup failed: ${conditionLookupError}`);
          const errorContent: Content = {
            text: `❌ **Failed to resolve condition ID**

            Condition ID: ${tokenId}
            Error: ${conditionLookupError instanceof Error ? conditionLookupError.message : "Unknown error"}

            Please try:
            - Using the specific token ID instead of condition ID
            - Verifying the market is active
            - Using "Show me active markets" to find the correct market`,
            actions: [],
            data: {
              error: "Condition ID lookup failed",
              conditionId: tokenId,
              lookupError: conditionLookupError instanceof Error ? conditionLookupError.message : "Unknown error",
            },
          };
          
          if (callback) {
            await callback(errorContent);
          }
          return createErrorResult("Failed to resolve condition ID to token ID");
        }
      }

      // Updated validation - price can be -1 for market orders
      if (!tokenId || !side || size <= 0) {
        return createErrorResult("Invalid order parameters");
      }
      
      // Don't validate price for market orders that will fetch price later
      if (price > 0 && (price < 0.01 || price > 0.99)) {
        return createErrorResult(`Invalid price ${price}. Must be between 0.01 and 0.99`);
      }

      // For market orders without explicit price, price will be set later
      if (orderType === "GTC" && price <= 0) {
        return createErrorResult("Limit orders require a valid price");
      }
    } catch (error) {
      logger.warn(`[placeOrderAction] LLM extraction failed, trying regex fallback`);

      // Fallback to regex extraction
      const text = message.content?.text || "";

      // Extract token ID
      const tokenMatch = text.match(
        /(?:token|market|id)\s+([a-zA-Z0-9]+)|([0-9]{5,})/i,
      );
      tokenId = tokenMatch?.[1] || tokenMatch?.[2] || "";

      // Extract side
      const sideMatch = text.match(/\b(buy|sell|long|short)\b/i);
      side = sideMatch?.[1]?.toUpperCase() || "BUY";

      // Extract price
      const priceMatch = text.match(/(?:price|at|for)\s*\$?([0-9]*\.?[0-9]+)/i);
      price = priceMatch ? parseFloat(priceMatch[1]) : 0;

      // Extract size
      const sizeMatch = text.match(
        /(?:size|amount|quantity)\s*([0-9]*\.?[0-9]+)|([0-9]*\.?[0-9]+)\s*(?:shares|tokens)/i,
      );
      size = sizeMatch ? parseFloat(sizeMatch[1] || sizeMatch[2]) : 1; // Default to 1 share

      // Extract order type
      const orderTypeMatch = text.match(/\b(GTC|FOK|GTD|FAK|limit|market)\b/i);
      if (orderTypeMatch) {
        const matched = orderTypeMatch[1].toUpperCase();
        orderType =
          matched === "LIMIT" ? "GTC" : matched === "MARKET" ? "GTC" : matched;
      } else {
        // Default to market order if no price specified
        orderType = "GTC"; // Always use GTC for better execution
      }

      // Set market order pricing flag if no price given
      if ((orderType === "FOK" || orderType === "GTC") && price <= 0) {
        price = -1; // Flag to fetch actual market price later
      }

      if (!tokenId || size <= 0 || (orderType === "GTC" && price <= 0)) {
        const errorMessage =
          "Please provide valid order parameters: token ID, price, and size.";
        logger.error(`[placeOrderAction] Parameter extraction failed`);

        const errorContent: Content = {
          text: `❌ **Error**: ${errorMessage}

          Please provide order details in your request. Examples:
          • "Buy 100 tokens of 123456 at $0.50 limit order"
          • "Sell 50 shares of token 789012 at $0.75"
          • "Place market order to buy 25 tokens of 456789"

          **Required parameters:**
          - Token ID (market identifier)
          - Side (buy/sell)
          - Price (in USD, 0-1.0 for prediction markets)
          - Size (number of shares)

          **Optional parameters:**
          - Order type (GTC/limit, FOK/market, GTD, FAK)
          - Fee rate (in basis points)`,
          actions: ["PLACE_ORDER"],
          data: { error: errorMessage },
        };

        if (callback) {
          await callback(errorContent);
        }
        return createErrorResult(errorMessage);
      }
    }

    // Validate parameters
    if (!["BUY", "SELL"].includes(side)) {
      side = "BUY"; // Default to buy
    }

    if (price > 1.0) {
      price = price / 100; // Convert percentage to decimal if needed
    }

    if (!["GTC", "FOK", "GTD", "FAK"].includes(orderType)) {
      orderType = "GTC"; // Default to GTC
    }

    // Calculate total order value and round to 6 decimals (USDC precision)
    const totalValue = Math.round(price * size * 1000000) / 1000000;

    // Enforce minimum order requirements: $1 minimum or 5 tokens minimum
    // If order value is less than $1, adjust size to meet minimum
    if (totalValue < 1.0) {
      // Calculate size needed for $1 minimum
      const minSizeForDollar = Math.ceil(1.0 / price);
      // Use the larger of 5 tokens or tokens needed for $1
      size = Math.max(5, minSizeForDollar);
      logger.info(
        `[placeOrderAction] Order below minimum. Adjusting size from ${totalValue.toFixed(2)} to ${size} tokens (min $1 or 5 tokens)`
      );
    }

    // If market order with -1 flag, fetch actual market price first
    if (price === -1) {
      logger.info(`[placeOrderAction] Market order detected, fetching current market price for token: ${tokenId}`);
      
      try {
        // Fetch the order book to get current market prices
        const bookUrl = `${runtime.getSetting("CLOB_API_URL")}/book?token_id=${tokenId}`;
        const bookResponse = await fetch(bookUrl);
        
        if (!bookResponse.ok) {
          throw new Error(`Failed to fetch order book: ${bookResponse.statusText}`);
        }
        
        const bookData = await bookResponse.json() as any;
        
        if (side === "BUY") {
          // For buy orders, look at the asks (what sellers are offering)
          const sortedAsks = bookData.asks?.sort((a: any, b: any) => parseFloat(a.price) - parseFloat(b.price));
          
          if (sortedAsks && sortedAsks.length > 0) {
            const bestAsk = parseFloat(sortedAsks[0].price);
            // Use a slightly higher price for FOK to ensure execution
            price = Math.min(0.99, bestAsk * 1.01); // Add 1% buffer, cap at 0.99
            
            logger.info(`[placeOrderAction] Market BUY - Best ask: ${bestAsk}, Using price: ${price}`);
            
            if (callback) {
              const priceContent: Content = {
                text: `📊 **Market Price Found**\n• **Best Ask**: $${bestAsk.toFixed(4)} (${(bestAsk * 100).toFixed(2)}%)\n• **Your Buy Price**: $${price.toFixed(4)} (${(price * 100).toFixed(2)}%)\n• **Buffer**: +1.0% for execution`,
                actions: [],
                data: { marketPrice: bestAsk, executionPrice: price },
              };
              await callback(priceContent);
            }
          } else {
            throw new Error("No asks available in order book");
          }
        } else {
          // For sell orders, look at the bids (what buyers are offering)
          const sortedBids = bookData.bids?.sort((a: any, b: any) => parseFloat(b.price) - parseFloat(a.price));
          
          if (sortedBids && sortedBids.length > 0) {
            const bestBid = parseFloat(sortedBids[0].price);
            // Use a slightly lower price for FOK to ensure execution
            price = Math.max(0.01, bestBid * 0.99); // Subtract 1% buffer, floor at 0.01
            
            logger.info(`[placeOrderAction] Market SELL - Best bid: ${bestBid}, Using price: ${price}`);
            
            if (callback) {
              const priceContent: Content = {
                text: `📊 **Market Price Found**\n• **Best Bid**: $${bestBid.toFixed(4)} (${(bestBid * 100).toFixed(2)}%)\n• **Your Sell Price**: $${price.toFixed(4)} (${(price * 100).toFixed(2)}%)\n• **Buffer**: -1.0% for execution`,
                actions: [],
                data: { marketPrice: bestBid, executionPrice: price },
              };
              await callback(priceContent);
            }
          } else {
            throw new Error("No bids available in order book");
          }
        }
      } catch (priceError) {
        logger.error(`[placeOrderAction] Failed to fetch market price: ${priceError}`);
        return createErrorResult(
          `Failed to fetch market price: ${priceError instanceof Error ? priceError.message : "Unknown error"}\n\nPlease specify a price for your order.`,
        );
      }
    }

    // Now calculate total value with actual price (not -1)
    const finalTotalValue = Math.round(price * size * 1000000) / 1000000;

    // Check Polymarket trading balance before placing order
    logger.info(`[placeOrderAction] Checking Polymarket trading balance for order value: $${finalTotalValue.toFixed(2)}`);

    try {
      const balanceInfo = await checkPolymarketBalance(
        runtime,
        finalTotalValue.toFixed(6),  // Ensure proper decimal format
      );

      if (!balanceInfo.hasEnoughBalance) {
        const balanceDisplay = formatBalanceInfo(balanceInfo);
        const errorContent: Content = {
          text: `${balanceDisplay}

          **Order Details:**
          • **Token ID**: ${tokenId}
          • **Side**: ${side}
          • **Price**: $${price.toFixed(4)} (${(price * 100).toFixed(2)}%)
          • **Size**: ${size} shares
          • **Total Value**: $${finalTotalValue.toFixed(2)}

          Please add more USDC to your wallet and try again.`,
          actions: [],
          data: {
            error: "Insufficient USDC balance",
            balanceInfo,
            orderDetails: { tokenId, side, price, size, totalValue: finalTotalValue },
          },
        };

        if (callback) {
          await callback(errorContent);
        }
        return createErrorResult("Insufficient USDC balance for order");
      }

      // Check position size limits
      const maxPositionSize = await getMaxPositionSize(runtime);
      if (finalTotalValue > maxPositionSize) {
        const errorContent: Content = {
          text: `❌ **Order Exceeds Position Limit**

          **Position Limit Check:**
          • **Max Position Size**: $${maxPositionSize.toFixed(2)}
          • **Requested Order**: $${finalTotalValue.toFixed(2)}
          • **Excess Amount**: $${(finalTotalValue - maxPositionSize).toFixed(2)}

          **Order Details:**
          • **Token ID**: ${tokenId}
          • **Side**: ${side}
          • **Price**: $${price.toFixed(4)}
          • **Size**: ${size} shares

          Please reduce your order size to stay within the configured limit.`,
          actions: [],
          data: {
            error: "Order exceeds position limit",
            maxPositionSize,
            requestedAmount: finalTotalValue,
            orderDetails: { tokenId, side, price, size },
          },
        };

        if (callback) {
          await callback(errorContent);
        }
        return createErrorResult("Order exceeds maximum position size limit");
      }

      // Display successful balance check
      logger.info(`[placeOrderAction] Balance check passed. Proceeding with order.`);
      
      // Simplified user message
      if (callback) {
        const balanceContent: Content = {
          text: `📊 **Placing ${side.toUpperCase()} order** - ${size} shares at $${price.toFixed(4)} (Total: $${finalTotalValue.toFixed(2)})`,
          actions: [],
          data: {
            balanceInfo,
            orderDetails: { tokenId, side, price, size, totalValue: finalTotalValue },
          },
        };
        await callback(balanceContent);
      }
    } catch (balanceError) {
      logger.error(`[placeOrderAction] Balance check failed: ${balanceError}`);
      const errorContent: Content = {
        text: `❌ **Balance Check Failed**

        Unable to verify wallet balance before placing order. This could be due to:
        • Network connectivity issues
        • RPC provider problems  
        • Wallet configuration errors

        **Order Details:**
        • **Token ID**: ${tokenId}
        • **Side**: ${side}
        • **Price**: $${price.toFixed(4)}
        • **Size**: ${size} shares
        • **Total Value**: $${finalTotalValue.toFixed(2)}

        Please check your wallet configuration and try again.`,
        actions: [],
        data: {
          error: "Balance check failed",
          balanceError:
            balanceError instanceof Error
              ? balanceError.message
              : "Unknown error",
          orderDetails: { tokenId, side, price, size, totalValue },
        },
      };

      if (callback) {
        await callback(errorContent);
      }
      return createErrorResult(
        "Failed to verify wallet balance before order placement",
      );
    }

    try {
      // Check if we have API credentials, if not try to derive them
      logger.info(`[placeOrderAction] Checking for API credentials`);

      const hasApiKey = runtime.getSetting("CLOB_API_KEY");
      const hasApiSecret =
        runtime.getSetting("CLOB_API_SECRET") ||
        runtime.getSetting("CLOB_SECRET");
      const hasApiPassphrase =
        runtime.getSetting("CLOB_API_PASSPHRASE") ||
        runtime.getSetting("CLOB_PASS_PHRASE");

      if (!hasApiKey || !hasApiSecret || !hasApiPassphrase) {
        logger.info(`[placeOrderAction] API credentials missing, attempting to derive them`);

        // Derive credentials silently
        logger.info(`[placeOrderAction] Deriving API credentials from wallet...`);

        try {
          const client = await initializeClobClient(runtime);
          const derivedCreds = await client.deriveApiKey();

          // Store the derived credentials in runtime
          await runtime.setSetting("CLOB_API_KEY", derivedCreds.key);
          await runtime.setSetting("CLOB_API_SECRET", derivedCreds.secret);
          await runtime.setSetting(
            "CLOB_API_PASSPHRASE",
            derivedCreds.passphrase,
          );

          logger.info(`[placeOrderAction] Successfully derived and stored API credentials`);

          // Log success internally
          logger.info(`[placeOrderAction] API credentials derived and stored successfully`);
        } catch (deriveError) {
          logger.error(`[placeOrderAction] Failed to derive API credentials: ${deriveError}`);
          const errorContent: Content = {
            text: `❌ **Failed to Derive API Credentials**

            **Error**: ${deriveError instanceof Error ? deriveError.message : "Unknown error"}

            This could be due to:
            • Network connectivity issues
            • Wallet signature problems
            • Polymarket API issues

            Please ensure your wallet is properly configured and try again.`,
            actions: [],
            data: {
              error: "Failed to derive API credentials",
              deriveError:
                deriveError instanceof Error
                  ? deriveError.message
                  : "Unknown error",
            },
          };

          if (callback) {
            await callback(errorContent);
          }
          return createErrorResult(
            "Failed to derive API credentials for order posting",
          );
        }
      } else {
        logger.info(`[placeOrderAction] API credentials already available`);
      }

      // Now initialize client with credentials
      const client = await initializeClobClient(runtime);

      // Create order arguments matching the official ClobClient interface
      const orderArgs = {
        tokenID: tokenId, // Official package expects tokenID (capital ID)
        price,
        side: side === "BUY" ? Side.BUY : Side.SELL,
        size,
        feeRateBps: parseFloat(feeRateBps), // Convert to number
      };

      logger.info(`[placeOrderAction] Creating order with args: ${orderArgs}`);

      // Create the signed order with enhanced error handling
      let signedOrder: any;
      try {
        signedOrder = await client.createOrder(orderArgs);
        logger.info(`[placeOrderAction] Order created successfully`);
      } catch (createError) {
        logger.error(`[placeOrderAction] Error creating order: ${createError}`);

        // Check for specific error types
        if (createError instanceof Error) {
          if (createError.message.includes("minimum_tick_size")) {
            return createErrorResult(
              `Invalid market data: The market may not exist or be inactive. Please verify the token ID is correct and the market is active.`,
            );
          }
          if (createError.message.includes("undefined is not an object")) {
            return createErrorResult(
              `Market data unavailable: The token ID may be invalid or the market may be closed.`,
            );
          }
        }
        throw createError;
      }

      // Post the order with enhanced error handling
      let orderResponse: any;
      
      try {
        orderResponse = await client.postOrder(
          signedOrder,
          orderType as OrderType,
        ).catch((error: unknown) => {
          // Catch any errors from the promise
          logger.error(`[placeOrderAction] CLOB postOrder error caught: ${error}`);
          
          // Extract error message from various possible formats
          let errorMsg = "Order failed";
          const err = error as any;
          if (err?.response?.data?.error) {
            errorMsg = err.response.data.error;
          } else if (err?.data?.error) {
            errorMsg = err.data.error;
          } else if (err?.message) {
            errorMsg = err.message;
          } else if (typeof error === 'string') {
            errorMsg = error;
          }
          
          throw new Error(errorMsg);
        });
        
        // Check if the response indicates an error (even if no exception was thrown)
        // The CLOB client sometimes returns undefined or doesn't throw properly
        if (!orderResponse || orderResponse === undefined) {
          throw new Error("Order failed - no response from CLOB");
        }
        
        // Check for various failure indicators
        if (orderResponse.error || orderResponse.errorMsg || 
            (orderResponse.success === false) ||
            (!orderResponse.orderId && !orderResponse.status && !orderResponse.orderHashes)) {
          const errorMsg = orderResponse?.error || orderResponse?.errorMsg || "Order failed";
          throw new Error(errorMsg);
        }
        
        logger.info(`[placeOrderAction] Order posted successfully`);
      } catch (postError) {
        logger.error(`[placeOrderAction] Error posting order: ${postError}`);
        
        // Check if error is due to missing approvals
        const errorMessage = postError instanceof Error ? postError.message : String(postError);
        if (errorMessage.includes("not enough balance / allowance") || 
            errorMessage.includes("allowance") || 
            errorMessage.includes("approve")) {
          
          logger.info(`[placeOrderAction] Detected balance/approval issue, will attempt deposit first...`);
          
          // When we get "not enough balance / allowance", it usually means no L2 balance
          // We'll deposit the required amount plus a buffer
          // Since we can't reliably check L2 balance without the order working first,
          // we'll assume L2 balance is 0 and deposit the full amount needed
          const depositAmount = Math.ceil((finalTotalValue + 1) * 100) / 100; // Add $1 buffer
          
          logger.info(`[placeOrderAction] Will deposit $${depositAmount} to Polymarket L2`);
          
          // Always try deposit first when we get this error
          const shouldDeposit = true;
          
          if (shouldDeposit) {
            
            logger.info(`[placeOrderAction] Insufficient L2 balance. Need to deposit $${depositAmount}`);
            
            if (callback) {
              const depositContent: Content = {
                text: `💵 **Setting up trading** - Depositing $${depositAmount.toFixed(2)} USDC to Polymarket...`,
                actions: [],
                data: { depositing: true, amount: depositAmount },
              };
              await callback(depositContent);
            }
            
            // Import and execute deposit
            const { depositUSDC } = await import("../utils/depositManager");
            
            try {
              const depositResult = await depositUSDC(runtime, depositAmount.toFixed(2));
              
              if (depositResult.success) {
                logger.info(`[placeOrderAction] Deposit successful! TX: ${depositResult.transactionHash}`);
                
                // Log deposit success internally
                logger.info(`[placeOrderAction] Deposit complete. TX: ${depositResult.transactionHash}`);
                
                // Wait for deposit to be recognized
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                // Retry the order
                logger.info(`[placeOrderAction] Retrying order after deposit...`);
                const newSignedOrder = await client.createOrder(orderArgs);
                orderResponse = await client.postOrder(
                  newSignedOrder,
                  orderType as OrderType,
                );
                
                if (orderResponse && orderResponse.success !== false) {
                  logger.info(`[placeOrderAction] Order successful after deposit!`);
                  // Continue to normal success flow
                } else {
                  // If still fails, try approvals
                  logger.info(`[placeOrderAction] Order still failed after deposit, checking approvals...`);
                }
              } else {
                throw new Error("Deposit transaction failed");
              }
            } catch (depositError) {
              logger.error(`[placeOrderAction] Deposit failed: ${depositError}`);
              return createErrorResult(
                `Auto-deposit failed: ${depositError instanceof Error ? depositError.message : "Unknown error"}. Please deposit manually using "deposit $${depositAmount.toFixed(2)}"`,
              );
            }
          }
          
          // If we get here and orderResponse is still not successful, try approvals
          if (!orderResponse || orderResponse.success === false) {
            logger.info(`[placeOrderAction] Attempting approval setup...`);
            
            if (callback) {
              const approvalContent: Content = {
                text: `🔧 **Setting up approvals** - One-time setup for trading...`,
                actions: [],
                data: { requiresApproval: true }
              };
              await callback(approvalContent);
            }
            
            // Import and run the approval action
            const { approveUSDCAction } = await import("./approveUSDC");
            
            try {
              // Run the approval action
              const approvalResult = await approveUSDCAction.handler(
                runtime,
                message,
                state,
                options,
                callback
              );
              
              // Check if approval was successful
              if (approvalResult && approvalResult.success) {
                logger.info(`[placeOrderAction] Approvals set successfully, retrying order...`);
                
                // Log approval success internally  
                logger.info(`[placeOrderAction] Approvals set, retrying order...`);
                
                // Retry the order now that approvals are set
                try {
                  // Need to recreate the signed order after approval
                  const newSignedOrder = await client.createOrder(orderArgs);
                  orderResponse = await client.postOrder(
                    newSignedOrder,
                    orderType as OrderType,
                  );
                  logger.info(`[placeOrderAction] Order retry successful after approval`);
                } catch (retryError) {
                  logger.error(`[placeOrderAction] Order retry failed after approval: ${retryError}`);
                  return createErrorResult(
                    `Order failed even after setting approvals: ${retryError instanceof Error ? retryError.message : "Unknown error"}. Please check your USDC balance.`,
                  );
                }
              } else {
                logger.error(`[placeOrderAction] Failed to set approvals`);
                return createErrorResult(
                  `Failed to set USDC approvals. Please run "approve USDC" manually and ensure you have MATIC for gas fees.`,
                );
              }
            } catch (approvalError) {
              logger.error(`[placeOrderAction] Error setting approvals: ${approvalError}`);
              return createErrorResult(
                `Failed to set approvals: ${approvalError instanceof Error ? approvalError.message : "Unknown error"}. Please ensure you have MATIC for gas fees.`,
              );
            }
          }
        } else {
          // Other types of errors
          return createErrorResult(
            `Failed to submit order: ${errorMessage}`,
          );
        }
      }

      // Format response based on success
      let responseText: string;
      let responseData: any;

      if (orderResponse.success) {
        const sideText = side.toLowerCase();
        const orderTypeText = orderType === "FOK" ? "market" : "limit";
        const totalValueDisplay = (price * size).toFixed(2);

        const statusMessage = orderResponse.status === "matched"
          ? " - Order executed!"
          : orderResponse.status === "delayed"
            ? " - Processing (may take a moment)"
            : " - Order submitted";

        responseText = `✅ **${sideText.toUpperCase()} order placed successfully**${statusMessage}
        
${size} shares at $${price.toFixed(4)} • Total: $${totalValueDisplay}
Order ID: ${orderResponse.orderId || "Pending"}`;

        responseData = {
          success: true,
          orderDetails: {
            tokenId,
            side,
            price,
            size,
            orderType,
            feeRateBps,
            totalValue: totalValueDisplay,
          },
          orderResponse,
          timestamp: new Date().toISOString(),
        };
      } else {
        responseText = `❌ **Order failed** - ${orderResponse.errorMsg || "Unknown error"}
        
Attempted: ${side} ${size} shares at $${price.toFixed(4)}`;

        responseData = {
          success: false,
          error: orderResponse.errorMsg,
          orderDetails: {
            tokenId,
            side,
            price,
            size,
            orderType,
            feeRateBps,
          },
          timestamp: new Date().toISOString(),
        };
      }

      const responseContent: Content = {
        text: responseText,
        actions: [], // Don't suggest the same action again
        data: responseData,
      };

      if (callback) {
        await callback(responseContent);
      }

      return contentToActionResult(responseContent);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error occurred while placing order";
      logger.error(`[placeOrderAction] Order placement error: ${error}`);

      const errorContent: Content = {
        text: `❌ **Order Placement Error**

        **Error**: ${errorMessage}

        **Order Details:**
        • **Token ID**: ${tokenId}
        • **Side**: ${side}
        • **Price**: $${price.toFixed(4)}
        • **Size**: ${size} shares

        Please check your configuration and try again. Make sure:
        • CLOB_API_URL is properly configured
        • Token ID is valid and active
        • Price and size are within acceptable ranges
        • Network connection is stable`,
        actions: [],
        data: {
          error: errorMessage,
          orderDetails: { tokenId, side, price, size, orderType },
        },
      };

      if (callback) {
        await callback(errorContent);
      }
      return createErrorResult(errorMessage);
    }
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: {
          text: "I want to buy 100 shares of token 52114319501245915516055106046884209969926127482827954674443846427813813222426 at $0.50 as a limit order via Polymarket",
        },
      },
      {
        name: "{{user2}}",
        content: {
          text: "I'll place a limit buy order for you via Polymarket. Creating order for 100 shares at $0.50...",
          action: "POLYMARKET_PLACE_ORDER",
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: {
          text: "Place a market sell order for 50 tokens of 71321045679252212594626385532706912750332728571942532289631379312455583992563 via Polymarket",
        },
      },
      {
        name: "{{user2}}",
        content: {
          text: "I'll place a market sell order for you via Polymarket. This will execute immediately at the best available price...",
          action: "POLYMARKET_PLACE_ORDER",
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: {
          text: "Create a GTC order to buy 25 shares at 0.75 for market 123456789 via Polymarket",
        },
      },
      {
        name: "{{user2}}",
        content: {
          text: "I'll create a Good-Till-Cancelled buy order for you at $0.75 per share via Polymarket...",
          action: "POLYMARKET_PLACE_ORDER",
        },
      },
    ],
  ],
};
