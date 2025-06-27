import { describe, expect, it, vi } from 'vitest';
import plugin from '../src/plugin';

describe('Plugin Routes', () => {
  it('should have routes defined', () => {
    expect(plugin.routes).toBeDefined();
    if (plugin.routes) {
      expect(Array.isArray(plugin.routes)).toBe(true);
      expect(plugin.routes.length).toBeGreaterThan(0);
    }
  });

  it('should have a route for /welcome', async () => {
    if (plugin.routes) {
      const helloWorldRoute = plugin.routes.find((route) => route.path === '/welcome');

      if (helloWorldRoute && helloWorldRoute.handler) {
        // Create mock request and response objects
        const mockReq = {};
        const mockRes = {
          json: vi.fn(),
        };

        // Call the route handler
        await helloWorldRoute.handler(mockReq, mockRes, {} as any); // Provide a mock runtime

        // Verify response
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Polymarket plugin has started and is operational.' });
        expect(mockRes.json).toHaveBeenCalledTimes(1); // Ensure it's only called once
      } else {
        throw new Error("Route or handler not found");
      }
    }
 });

  it('should validate route structure', () => {
    if (plugin.routes) {
      // Validate each route
      plugin.routes.forEach((route) => {
        expect(route).toHaveProperty('path');
        expect(route).toHaveProperty('type');
        expect(route).toHaveProperty('handler');

        // Path should be a string starting with /
        expect(typeof route.path).toBe('string');
        expect(route.path.startsWith('/')).toBe(true);

        // Type should be a valid HTTP method
        expect(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).toContain(route.type);

        // Handler should be a function
        expect(typeof route.handler).toBe('function');
      });
    }
  });

  it('should have unique route paths', () => {
    if (plugin.routes) {
      const paths = plugin.routes.map((route) => route.path);
      const uniquePaths = new Set(paths);
      expect(paths.length).toBe(uniquePaths.size);
    }
  });
});
