import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock WebSocket for testing
global.WebSocket = vi.fn().mockImplementation(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn(),
  send: vi.fn(),
  readyState: WebSocket.OPEN,
  CONNECTING: WebSocket.CONNECTING,
  OPEN: WebSocket.OPEN,
  CLOSING: WebSocket.CLOSING,
  CLOSED: WebSocket.CLOSED,
}));

// Mock DragEvent for testing
class MockDragEvent extends Event {
  constructor(type: string, init?: any) {
    super(type, init);
    this.dataTransfer = {
      setData: vi.fn(),
      getData: vi.fn(),
      clearData: vi.fn(),
      files: [],
      items: [] as any,
      types: [],
      dropEffect: 'none',
      effectAllowed: 'all',
    };
  }
  dataTransfer: any;
}

global.DragEvent = MockDragEvent as any;

// Mock crypto.randomUUID for tests
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-1234'
  }
});

// Mock import.meta.env
vi.mock('import.meta.env', () => ({
  VITE_WS_URL: 'ws://localhost:8888/ws'
}), { hoisted: true });

// Suppress console errors in tests unless debugging
if (!process.env.DEBUG_TESTS) {
  console.error = vi.fn();
  console.warn = vi.fn();
}