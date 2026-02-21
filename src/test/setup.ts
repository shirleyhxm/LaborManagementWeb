/**
 * Vitest global setup file
 *
 * Runs before all tests to configure the testing environment
 */

import { expect, afterEach, beforeEach, vi } from 'vitest';

// Mock environment variables for tests
vi.stubEnv('VITE_APP_ENV', 'test');
vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080/api');
vi.stubEnv('VITE_ENABLE_CONSOLE_LOGS', 'false');
vi.stubEnv('VITE_LOG_LEVEL', 'error');

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock,
});

// Clear all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

// Suppress console errors in tests (can be overridden in individual tests)
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});

// Add custom matchers or global test utilities here
// Example: expect.extend({ customMatcher: ... });
