import { vi } from 'vitest';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';

export function createMockRuntime(overrides?: Partial<IAgentRuntime>): IAgentRuntime {
  return {
    getSetting: vi.fn(),
    getMemory: vi.fn(),
    getMemories: vi.fn(),
    saveMemory: vi.fn(),
    processActions: vi.fn(),
    evaluate: vi.fn(),
    createMemory: vi.fn(),
    character: {},
    databaseAdapter: {},
    messageManager: {},
    modelProvider: {},
    actions: [],
    providers: [],
    evaluators: [],
    services: [],
    ...overrides,
  } as unknown as IAgentRuntime;
}

export function createMockMessage(overrides?: Partial<Memory>): Memory {
  return {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' as `${string}-${string}-${string}-${string}-${string}`,
    content: { text: 'Test message' },
    entityId: 'f47ac10b-58cc-4372-a567-0e02b2c3d480' as `${string}-${string}-${string}-${string}-${string}`,
    roomId: 'f47ac10b-58cc-4372-a567-0e02b2c3d481' as `${string}-${string}-${string}-${string}-${string}`,
    agentId: 'f47ac10b-58cc-4372-a567-0e02b2c3d482' as `${string}-${string}-${string}-${string}-${string}`,
    createdAt: Date.now(),
    ...overrides,
  };
}

export function createMockState(overrides?: Partial<State>): State {
  return {
    recentMessages: [],
    values: {},
    data: {},
    text: '',
    ...overrides,
  } as unknown as State;
}

// Alias for compatibility
export const createTestRuntime = createMockRuntime;