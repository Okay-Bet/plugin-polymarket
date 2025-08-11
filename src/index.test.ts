import { describe, it, expect } from "vitest";
import polymarketPlugin from "./plugin";

describe("Polymarket Plugin", () => {
  it("should export a valid plugin", () => {
    expect(polymarketPlugin).toBeDefined();
    expect(polymarketPlugin.name).toBe("polymarket");
  });

  it("should have required properties", () => {
    expect(polymarketPlugin.description).toBeDefined();
    expect(polymarketPlugin.actions).toBeDefined();
    expect(Array.isArray(polymarketPlugin.actions)).toBe(true);
  });

  it("should have tests defined", () => {
    expect(polymarketPlugin.tests).toBeDefined();
    expect(Array.isArray(polymarketPlugin.tests)).toBe(true);
    expect(polymarketPlugin.tests.length).toBeGreaterThan(0);
  });
});