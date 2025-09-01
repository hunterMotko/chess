import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useSocket } from '../useSocket';

// Mock WebSocket
const mockWebSocket = {
  close: vi.fn(),
  send: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.OPEN,
  onopen: null,
  onmessage: null,
  onclose: null,
  onerror: null,
};

global.WebSocket = vi.fn(() => mockWebSocket) as any;

describe('useSocket', () => {
  const gameId = 'test-game-123';
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset WebSocket mock state
    mockWebSocket.readyState = WebSocket.OPEN;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useSocket({ gameId }));

    expect(result.current.data).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(typeof result.current.sendMsg).toBe('function');
  });

  it('should create WebSocket with correct URL', () => {
    renderHook(() => useSocket({ gameId }));

    expect(WebSocket).toHaveBeenCalledWith(`ws://localhost:8888/ws/${gameId}`);
  });

  it('should set isConnected to true when WebSocket opens', () => {
    const { result } = renderHook(() => useSocket({ gameId }));

    act(() => {
      // Simulate WebSocket onopen event
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen({} as Event);
      }
    });

    expect(result.current.isConnected).toBe(true);
  });

  it('should set isConnected to false when WebSocket closes', () => {
    const { result } = renderHook(() => useSocket({ gameId }));

    // First connect
    act(() => {
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen({} as Event);
      }
    });

    expect(result.current.isConnected).toBe(true);

    // Then disconnect
    act(() => {
      if (mockWebSocket.onclose) {
        mockWebSocket.onclose({} as CloseEvent);
      }
    });

    expect(result.current.isConnected).toBe(false);
  });

  it('should parse and set data when receiving valid JSON message', () => {
    const { result } = renderHook(() => useSocket({ gameId }));
    const testData = { type: 'move', payload: 'e2e4' };

    act(() => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify(testData)
        } as MessageEvent);
      }
    });

    expect(result.current.data).toEqual(testData);
  });

  it('should handle invalid JSON messages gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useSocket({ gameId }));

    act(() => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: 'invalid json'
        } as MessageEvent);
      }
    });

    expect(result.current.data).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  it('should send message when connected', () => {
    const { result } = renderHook(() => useSocket({ gameId }));

    // Connect first
    act(() => {
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen({} as Event);
      }
    });

    const messageType = 'new_game';
    const messagePayload = { gameId: 'test-123' };

    act(() => {
      result.current.sendMsg(messageType, messagePayload);
    });

    expect(mockWebSocket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: messageType,
        payload: messagePayload
      })
    );
  });

  it('should not send message when not connected', () => {
    const { result } = renderHook(() => useSocket({ gameId }));

    // Don't connect, try to send message
    act(() => {
      result.current.sendMsg('test', {});
    });

    expect(mockWebSocket.send).not.toHaveBeenCalled();
  });

  it('should clean up WebSocket on unmount', () => {
    const { unmount } = renderHook(() => useSocket({ gameId }));

    unmount();

    expect(mockWebSocket.close).toHaveBeenCalled();
  });

  it('should handle WebSocket error events', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderHook(() => useSocket({ gameId }));

    const errorEvent = new Error('Connection failed');

    act(() => {
      if (mockWebSocket.onerror) {
        mockWebSocket.onerror(errorEvent as any);
      }
    });

    expect(consoleSpy).toHaveBeenCalledWith(errorEvent);
    consoleSpy.mockRestore();
  });

  it('should reconnect with new gameId', () => {
    const { result, rerender } = renderHook(
      ({ gameId }) => useSocket({ gameId }),
      { initialProps: { gameId: 'game-1' } }
    );

    expect(WebSocket).toHaveBeenCalledWith('ws://localhost:8888/ws/game-1');

    // Change gameId
    rerender({ gameId: 'game-2' });

    expect(WebSocket).toHaveBeenCalledWith('ws://localhost:8888/ws/game-2');
    expect(mockWebSocket.close).toHaveBeenCalled();
  });

  // Performance test
  it('should handle rapid message sending without issues', () => {
    const { result } = renderHook(() => useSocket({ gameId }));

    // Connect first
    act(() => {
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen({} as Event);
      }
    });

    // Send multiple messages rapidly
    act(() => {
      for (let i = 0; i < 100; i++) {
        result.current.sendMsg('rapid_test', { id: i });
      }
    });

    expect(mockWebSocket.send).toHaveBeenCalledTimes(100);
  });

  // Edge case: WebSocket closes during send attempt
  it('should handle WebSocket closing during send attempt', () => {
    const { result } = renderHook(() => useSocket({ gameId }));

    // Connect first
    act(() => {
      if (mockWebSocket.onopen) {
        mockWebSocket.onopen({} as Event);
      }
    });

    // Simulate WebSocket closing
    act(() => {
      if (mockWebSocket.onclose) {
        mockWebSocket.onclose({} as CloseEvent);
      }
    });

    // Try to send message after closing
    act(() => {
      result.current.sendMsg('test', {});
    });

    expect(mockWebSocket.send).not.toHaveBeenCalled();
  });
});