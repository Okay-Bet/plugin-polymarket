import { describe, it, expect, beforeEach, vi } from "vitest";
import { 
  fetchPositionsWithFallback,
  isMarketEligibleForRedemption,
  checkOnChainResolution,
  type Position,
  type ResolvedMarket,
} from "../src/utils/positionFetcher";
import {
  fetchMarketInfoWithFallback,
  validateMarketForRedemption,
  type MarketInfo,
} from "../src/utils/marketValidation";
import { ethers } from "ethers";

// Mock fetch globally
global.fetch = vi.fn();

// Mock ethers Contract
vi.mock("ethers", async () => {
  const actual = await vi.importActual<typeof import("ethers")>("ethers");
  return {
    ...actual,
    Contract: vi.fn().mockImplementation(() => ({
      payoutDenominator: vi.fn(),
    })),
  };
});

// Mock CLOB client
vi.mock("../src/utils/clobClient", () => ({
  initializeClobClient: vi.fn().mockResolvedValue({
    getOrders: vi.fn().mockResolvedValue([]),
    getBalances: vi.fn().mockResolvedValue({}),
  }),
}));

describe("Position Fetching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch positions from CLOB client", async () => {
    const mockRuntime = {
      getSetting: vi.fn().mockReturnValue("0x123"),
    };

    const positions = await fetchPositionsWithFallback(
      mockRuntime as any,
      "0xTestWallet"
    );

    expect(positions).toBeDefined();
    expect(Array.isArray(positions)).toBe(true);
  });

  it("should fall back to gamma-api when CLOB client fails", async () => {
    const mockRuntime = {
      getSetting: vi.fn().mockReturnValue(null), // No private key
    };

    const mockPositions = [
      {
        conditionId: "0x123",
        tokenId: "0xabc",
        outcome: "YES",
        size: "100",
        currentPrice: 0.75,
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ positions: mockPositions }),
    });

    const positions = await fetchPositionsWithFallback(
      mockRuntime as any,
      "0xTestWallet"
    );

    expect(positions).toHaveLength(1);
    expect(positions[0].conditionId).toBe("0x123");
  });

  it("should fall back to data-api when other sources fail", async () => {
    const mockRuntime = {
      getSetting: vi.fn().mockReturnValue(null),
    };

    // First call fails (gamma-api)
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    // Second call succeeds (data-api)
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            conditionId: "0x456",
            tokenId: "0xdef",
            outcome: "NO",
            size: "50",
            market: {
              endDate: "2024-12-01",
            },
          },
        ],
      }),
    });

    const positions = await fetchPositionsWithFallback(
      mockRuntime as any,
      "0xTestWallet"
    );

    expect(positions).toHaveLength(1);
    expect(positions[0].conditionId).toBe("0x456");
  });
});

describe("Market Resolution Detection", () => {
  it("should identify resolved markets correctly", () => {
    const resolvedMarket: ResolvedMarket = {
      conditionId: "0x123",
      question: "Will X happen?",
      resolved: true,
      closed: true,
      endDate: "2024-11-01",
      positions: [
        {
          tokenId: "0xabc",
          outcome: "YES",
          size: "100",
        },
      ],
    };

    expect(isMarketEligibleForRedemption(resolvedMarket)).toBe(true);
  });

  it("should filter out old markets (before June 2024)", () => {
    const oldMarket: ResolvedMarket = {
      conditionId: "0x123",
      question: "Old market?",
      resolved: true,
      closed: true,
      endDate: "2024-05-01", // Before June 2024
      positions: [
        {
          tokenId: "0xabc",
          outcome: "YES",
          size: "100",
        },
      ],
    };

    expect(isMarketEligibleForRedemption(oldMarket)).toBe(false);
  });

  it("should filter out unresolved markets", () => {
    const unresolvedMarket: ResolvedMarket = {
      conditionId: "0x123",
      question: "Future market?",
      resolved: false,
      closed: false,
      positions: [
        {
          tokenId: "0xabc",
          outcome: "YES",
          size: "100",
        },
      ],
    };

    expect(isMarketEligibleForRedemption(unresolvedMarket)).toBe(false);
  });

  it("should filter out markets with tiny positions", () => {
    const tinyPositionMarket: ResolvedMarket = {
      conditionId: "0x123",
      question: "Market with tiny position?",
      resolved: true,
      closed: true,
      positions: [
        {
          tokenId: "0xabc",
          outcome: "YES",
          size: "0.001", // Less than 0.01
        },
      ],
    };

    expect(isMarketEligibleForRedemption(tinyPositionMarket)).toBe(false);
  });
});

describe("Market Validation", () => {
  it("should validate market with correct payout configuration", () => {
    const validMarket: MarketInfo = {
      conditionId: "0x1234567890123456789012345678901234567890123456789012345678901234",
      question: "Valid market?",
      endDate: "2024-11-01",
      closed: true,
      resolved: true,
    };

    const result = validateMarketForRedemption(validMarket);
    expect(result.isValid).toBe(true);
  });

  it("should reject market with invalid condition ID format", () => {
    const invalidMarket: MarketInfo = {
      conditionId: "invalid-id",
      question: "Invalid market?",
      closed: true,
      resolved: true,
    };

    const result = validateMarketForRedemption(invalidMarket);
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("Invalid condition ID format");
  });

  it("should reject very recent markets not marked as resolved", () => {
    const recentMarket: MarketInfo = {
      conditionId: "0x1234567890123456789012345678901234567890123456789012345678901234",
      question: "Recent market?",
      endDate: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      closed: true,
      resolved: false,
    };

    const result = validateMarketForRedemption(recentMarket);
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("less than 1 hour ago");
  });
});

describe("On-Chain Resolution Check", () => {
  it("should detect resolved markets on-chain", async () => {
    const mockProvider = new ethers.JsonRpcProvider("https://polygon-rpc.com");
    
    // Mock the contract to return a positive payout denominator
    const mockContract = {
      payoutDenominator: vi.fn().mockResolvedValue(BigInt(10000)),
    };
    
    (ethers.Contract as any).mockImplementation(() => mockContract);

    const isResolved = await checkOnChainResolution(
      mockProvider,
      "0x1234567890123456789012345678901234567890123456789012345678901234"
    );

    expect(isResolved).toBe(true);
    expect(mockContract.payoutDenominator).toHaveBeenCalled();
  });

  it("should detect unresolved markets on-chain", async () => {
    const mockProvider = new ethers.JsonRpcProvider("https://polygon-rpc.com");
    
    // Mock the contract to return zero payout denominator
    const mockContract = {
      payoutDenominator: vi.fn().mockResolvedValue(BigInt(0)),
    };
    
    (ethers.Contract as any).mockImplementation(() => mockContract);

    const isResolved = await checkOnChainResolution(
      mockProvider,
      "0x1234567890123456789012345678901234567890123456789012345678901234"
    );

    expect(isResolved).toBe(false);
  });

  it("should handle on-chain check errors gracefully", async () => {
    const mockProvider = new ethers.JsonRpcProvider("https://polygon-rpc.com");
    
    // Mock the contract to throw an error
    const mockContract = {
      payoutDenominator: vi.fn().mockRejectedValue(new Error("Network error")),
    };
    
    (ethers.Contract as any).mockImplementation(() => mockContract);

    const isResolved = await checkOnChainResolution(
      mockProvider,
      "0x1234567890123456789012345678901234567890123456789012345678901234"
    );

    expect(isResolved).toBe(false);
  });
});

describe("Market Info Fetching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch market info from gamma-api", async () => {
    const mockMarket = {
      conditionId: "0x123",
      question: "Test market?",
      endDate: "2024-12-01",
      closed: true,
      resolved: true,
      negRisk: false,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockMarket],
    });

    const marketInfo = await fetchMarketInfoWithFallback("0x123");

    expect(marketInfo).toBeDefined();
    expect(marketInfo?.question).toBe("Test market?");
    expect(marketInfo?.resolved).toBe(true);
  });

  it("should fall back to CLOB API when gamma-api fails", async () => {
    // First call fails (gamma-api)
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    // Second call succeeds (CLOB API)
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        condition_id: "0x123",
        question: "CLOB market?",
        end_date_iso: "2024-12-01",
        closed: true,
        resolved: true,
      }),
    });

    const marketInfo = await fetchMarketInfoWithFallback("0x123");

    expect(marketInfo).toBeDefined();
    expect(marketInfo?.question).toBe("CLOB market?");
  });

  it("should return null when all sources fail", async () => {
    // Both calls fail
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: false, status: 500 });

    const marketInfo = await fetchMarketInfoWithFallback("0x123");

    expect(marketInfo).toBeNull();
  });
});