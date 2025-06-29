import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';
import { logger } from '@elizaos/core/v2';
import dotenv from 'dotenv';
import {
	runCoreActionTests,
	documentTestResult,
} from './utils/core-test-utils';
import plugin from '../src/plugin';

// Setup environment variables
dotenv.config();

// Spy on logger to capture logs for documentation
beforeAll(() => {
	vi.spyOn(logger, 'info');
	vi.spyOn(logger, 'error');
	vi.spyOn(logger, 'warn');
});

afterAll(() => {
	vi.restoreAllMocks();
});

describe('Actions', () => {

	// Run core tests on all plugin actions
	it('should pass core action tests', () => {
		if (plugin.actions) {
			const coreTestResults = runCoreActionTests(plugin.actions);
			expect(coreTestResults).toBeDefined();
			expect(coreTestResults.formattedNames).toBeDefined();
			expect(coreTestResults.formattedActions).toBeDefined;
			expect(coreTestResults.composedExamples).toBeDefined();

			// Document the core test results
			documentTestResult('Core Action Tests', coreTestResults);
		}
	});
});
