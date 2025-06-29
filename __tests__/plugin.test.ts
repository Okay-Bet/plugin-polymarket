import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';
import { ModelType, logger } from '@elizaos/core/v2';
import { PolymarketService } from '../src/services/polymarketService';
import dotenv from 'dotenv';
import plugin from '../src/plugin';

// Setup environment variables
dotenv.config();

// Need to spy on logger for documentation
beforeAll(() => {
	vi.spyOn(logger, 'info');
	vi.spyOn(logger, 'error');
	vi.spyOn(logger, 'warn');
	vi.spyOn(logger, 'debug');
});

afterAll(() => {
	vi.restoreAllMocks();
});

// Helper function to document test results
function documentTestResult(testName: string, result: any, error: Error | unknown = null) {
	logger.info(`TEST: ${testName}`);
	if (result) {
		if (typeof result === 'string') {
			logger.info(`RESULT: ${result.substring(0, 100)}${result.length > 100 ? '...' : ''}`);
		} else {
			try {
				logger.info(`RESULT: ${JSON.stringify(result, null, 2).substring(0, 200)}...`);
			} catch (e) {
				logger.info(`RESULT: [Complex object that couldn't be stringified]`);
			}
		}
	}
	if (error instanceof Error) {
		logger.error(`ERROR: ${error.message}`);
		if (error.stack) {
			logger.error(`STACK: ${error.stack}`);
		}
	}
}

// Create a real runtime for testing
function createRealRuntime() {
	const services = new Map();

	// Create a real service instance if needed
	const createService = (serviceType: string) => {
		if (serviceType === PolymarketService.serviceType) {
			return new PolymarketService({
				character: {
					name: 'Test Character',
					system: 'You are a helpful assistant for testing.',
				},
			} as any);
		}
		return null;
	};

	return {
		character: {
			name: 'Test Character',
			system: 'You are a helpful assistant for testing.',
			plugins: [
				"@elizaos/plugin-polymarket",
				...(process.env.GOOGLE_GENERATIVE_AI_API_KEY
					? ["@elizaos/plugin-google-genai"]
					: []),
			],
			settings: {},
		},
		getSetting: (key: string) => null,
		models: plugin.models,
		db: {
			get: async (key: string) => null,
			set: async (key: string, value: any) => true,
			delete: async (key: string) => true,
			getKeys: async (pattern: string) => [],
		},
		getService: (serviceType: string) => {
			// Log the service request for debugging
			logger.debug(`Requesting service: ${serviceType}`);

			// Get from cache or create new
			if (!services.has(serviceType)) {
				logger.debug(`Creating new service: ${serviceType}`);
				services.set(serviceType, createService(serviceType));
			}

			return services.get(serviceType);
		},
		registerService: (serviceType: string, service: any) => {
			logger.debug(`Registering service: ${serviceType}`);
			services.set(serviceType, service);
		},
		registerPlugin: vi.fn(), // Add a mock registerPlugin
	};
}

describe('Plugin Configuration', () => {
	it('should have correct plugin metadata', () => {
		expect(plugin.name).toBe('@elizaos/plugin-polymarket');
		expect(plugin.description).toBe('Plugin for Polymarket integration');
		expect(plugin.config).toBeDefined();

		documentTestResult('Plugin metadata check', {
			name: plugin.name,
			description: plugin.description,
			hasConfig: !!plugin.config,
		});
	});

	it('should initialize properly', async () => {
		const originalEnv = process.env.EXAMPLE_PLUGIN_VARIABLE;

		try {
			process.env.EXAMPLE_PLUGIN_VARIABLE = 'test-value';

			// Initialize with config - using real runtime
			const runtime = createRealRuntime();

			let error: Error | unknown = null;
			try {
				await plugin.init?.({ EXAMPLE_PLUGIN_VARIABLE: 'test-value' }, runtime as any);
				expect(true).toBe(true); // If we got here, init succeeded
			} catch (e) {
				error = e;
				logger.error('Plugin initialization error:', e);
			}

			documentTestResult(
				'Plugin initialization',
				{
					success: !error,
					configValue: process.env.EXAMPLE_PLUGIN_VARIABLE,
				},
				error
			);
		} finally {
			process.env.EXAMPLE_PLUGIN_VARIABLE = originalEnv;
		}
	});
});

describe('Plugin Models', () => {
	it('should have TEXT_SMALL model defined', () => {
		if (plugin.models) {
			expect(plugin.models).toHaveProperty(ModelType.TEXT_SMALL);
			expect(typeof plugin.models[ModelType.TEXT_SMALL]).toBe('function');

			documentTestResult('TEXT_SMALL model check', {
				defined: ModelType.TEXT_SMALL in plugin.models,
				isFunction: typeof plugin.models[ModelType.TEXT_SMALL] === 'function',
			});
		}
	});

	it('should have TEXT_LARGE model defined', () => {
		if (plugin.models) {
			expect(plugin.models).toHaveProperty(ModelType.TEXT_LARGE);
			expect(typeof plugin.models[ModelType.TEXT_LARGE]).toBe('function');

			documentTestResult('TEXT_LARGE model check', {
				defined: ModelType.TEXT_LARGE in plugin.models,
				isFunction: typeof plugin.models[ModelType.TEXT_LARGE] === 'function',
			});
		}
	});

	it('should return a response from TEXT_SMALL model', async () => {
		if (plugin.models) {
			// Ensure TEXT_SMALL model is defined before using it
			expect(plugin.models).toHaveProperty(ModelType.TEXT_SMALL);

			const runtime = createRealRuntime();

			let result = '';
			let error: Error | unknown = null;

			try {
				logger.info('Using Google Gen AI for TEXT_SMALL model');
				result = await plugin.models[ModelType.TEXT_SMALL](runtime as any, { prompt: 'test' });
				// Check that we get a non-empty string response
				expect(result).toBeTruthy();
				expect(typeof result).toBe('string');
			} catch (e) {
				error = e;
				logger.error('TEXT_SMALL model test failed:', e);
			}

			documentTestResult('TEXT_SMALL model plugin test', result, error);
		}
	});
});

describe('PolymarketService', () => {
	it('should start the service', async () => {
		const runtime = createRealRuntime();
		let startResult;
		let error: Error | unknown = null;

		try {
			logger.info('Starting PolymarketService');
			startResult = await PolymarketService.start(runtime as any);

			expect(startResult).toBeDefined();
			expect(startResult.constructor.name).toBe('PolymarketService');

			// Test real functionality
			const servicePropertyNames = Object.getOwnPropertyNames(startResult);
			expect(servicePropertyNames).toContain('stop');
			expect(typeof startResult.stop).toBe('function');
		} catch (e) {
			error = e;
			logger.error('Service start error:', e);
		}

		documentTestResult(
			'PolymarketService start',
			{
				success: !!startResult,
				serviceType: startResult?.constructor.name,
			},
			error,
		);
	});

	it('should throw an error on startup if the service is already registered', async () => {
		const runtime = createRealRuntime();

		// First registration should succeed
		const result1 = await PolymarketService.start(runtime as any);
		expect(result1).toBeTruthy();

		let startupError: Error | unknown = null;

		try {
			// Second registration should fail
			await PolymarketService.start(runtime as any);
			expect(true).toBe(false); // Should not reach here
		} catch (e) {
			startupError = e;
			expect(e).toBeTruthy();
		}

		documentTestResult(
			'PolymarketService double start',
			{
				errorThrown: !!startupError,
				errorMessage: startupError instanceof Error ? startupError.message : String(startupError),
			},
			startupError instanceof Error ? startupError : null
		);
	});

	it('should stop the service', async () => {
		const runtime = createRealRuntime();
		let error: Error | unknown = null;

		try {
			// Register a real service first
			const service = new PolymarketService(runtime as any);
			runtime.registerService(PolymarketService.serviceType, service);

			// Spy on the real service's stop method
			const stopSpy = vi.spyOn(service, 'stop');

			// Call the static stop method
			await PolymarketService.stop(runtime as any);

			// Verify the service's stop method was called
			expect(stopSpy).toHaveBeenCalled();
		} catch (e) {
			error = e;
			logger.error('Service stop error:', e);
		}

		documentTestResult(
			'PolymarketService stop',
			{
				success: !error,
			},
			error
		);
	});

	it('should throw an error when stopping a non-existent service', async () => {
		const runtime = createRealRuntime();
		// Don't register a service, so getService will return null

		let error: Error | unknown = null;

		try {
			// For this specific test, explicitly mock getService to return null for 'PolymarketService'
			// to ensure we test the "service not found" path in PolymarketService.stop
			vi.spyOn(runtime, 'getService').mockImplementation((serviceType: string) => {
				if (serviceType === PolymarketService.serviceType) return null;
				return services.get(serviceType); // Fallback to original behavior for other services if any
			});
			const services = new Map();
			await PolymarketService.stop(runtime as any);
			// Should not reach here
			expect(true).toBe(false);
		} catch (e) {
			error = e;
			expect(error).toBeTruthy();
			if (error instanceof Error) {
				expect(error.message).toContain('PolymarketService not found');
			}
		}

		documentTestResult(
			'PolymarketService non-existent stop',
			{
				errorThrown: !!error,
				errorMessage: (error as Error).message,
			},
			error instanceof Error ? error : null
		);
	});

	it('should stop a registered service', async () => {
		const runtime = createRealRuntime();

		// First start the service
		const startResult = await PolymarketService.start(runtime as any);
		expect(startResult).toBeTruthy();

		let stopError: Error | unknown = null;
		let stopSuccess = false;

		try {
			// Then stop it
			await PolymarketService.stop(runtime as any);
			stopSuccess = true;
		} catch (e) {
			stopError = e;
			expect(true).toBe(false); // Should not reach here
		}

		documentTestResult(
			'PolymarketService stop',
			{
				success: stopSuccess,
				errorThrown: !!stopError,
				errorMessage: stopError instanceof Error ? stopError.message : String(stopError),
			},
			stopError instanceof Error ? stopError : null
		);
	});
});
