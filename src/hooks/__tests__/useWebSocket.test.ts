const { renderHook, act, waitFor } = require('@testing-library/react');
import { useWebSocket } from '../useWebSocket';
import { WebSocketClient } from '@/lib/websocket/client';
import { ExecutionEvent, ErrorResponse, WebSocketMessage } from '@/lib/websocket/protocol';

// Mock WebSocketClient
jest.mock('@/lib/websocket/client', () => {
  return {
    WebSocketClient: jest.fn().mockImplementation((options) => {
      const instance = {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn(),
        send: jest.fn(),
        isConnected: jest.fn().mockReturnValue(false),
        on: jest.fn().mockReturnValue(() => {}),
        _options: options,
        _handlers: new Map<string, ((message: WebSocketMessage) => void)[]>(),
      };

      // Store handlers for testing
      instance.on.mockImplementation((type: string, handler: (message: WebSocketMessage) => void) => {
        if (!instance._handlers.has(type)) {
          instance._handlers.set(type, []);
        }
        instance._handlers.get(type)!.push(handler);
        return () => {
          const handlers = instance._handlers.get(type);
          if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
              handlers.splice(index, 1);
            }
          }
        };
      });

      return instance;
    }),
  };
});

describe('useWebSocket', () => {
  const mockUrl = 'ws://localhost:8080/ws';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with disconnected state', () => {
    const { result } = renderHook(() =>
      useWebSocket({
        url: mockUrl,
        enabled: false,
      })
    );

    expect(result.current.connected).toBe(false);
    expect(result.current.connecting).toBe(false);
    expect(result.current.reconnecting).toBe(false);
  });

  it('should auto-connect when enabled is true', async () => {
    const mockClient = {
      connect: jest.fn().mockImplementation(function(this: any) {
        this._options?.onOpen?.();
        return Promise.resolve();
      }),
      disconnect: jest.fn(),
      send: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true),
      on: jest.fn().mockReturnValue(() => {}),
      _options: null as any,
    };

    (WebSocketClient as jest.Mock).mockImplementation((options) => {
      mockClient._options = options;
      return mockClient;
    });

    const { result } = renderHook(() =>
      useWebSocket({
        url: mockUrl,
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(mockClient.connect).toHaveBeenCalled();
    });
  });

  it('should not auto-connect when enabled is false', () => {
    const mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
      send: jest.fn(),
      isConnected: jest.fn().mockReturnValue(false),
      on: jest.fn().mockReturnValue(() => {}),
    };

    (WebSocketClient as jest.Mock).mockImplementation(() => mockClient);

    renderHook(() =>
      useWebSocket({
        url: mockUrl,
        enabled: false,
      })
    );

    expect(mockClient.connect).not.toHaveBeenCalled();
  });

  it('should provide connect function', async () => {
    const mockClient = {
      connect: jest.fn().mockImplementation(function(this: any) {
        this._options?.onOpen?.();
        return Promise.resolve();
      }),
      disconnect: jest.fn(),
      send: jest.fn(),
      isConnected: jest.fn().mockReturnValue(false),
      on: jest.fn().mockReturnValue(() => {}),
      _options: null as any,
    };

    (WebSocketClient as jest.Mock).mockImplementation((options) => {
      mockClient._options = options;
      mockClient.isConnected.mockReturnValue(false);
      return mockClient;
    });

    const { result } = renderHook(() =>
      useWebSocket({
        url: mockUrl,
        enabled: false,
      })
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(mockClient.connect).toHaveBeenCalled();
  });

  it('should provide disconnect function', async () => {
    const mockClient = {
      connect: jest.fn().mockImplementation(function(this: any) {
        this._options?.onOpen?.();
        return Promise.resolve();
      }),
      disconnect: jest.fn(),
      send: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true),
      on: jest.fn().mockReturnValue(() => {}),
      _options: null as any,
    };

    (WebSocketClient as jest.Mock).mockImplementation((options) => {
      mockClient._options = options;
      return mockClient;
    });

    const { result } = renderHook(() =>
      useWebSocket({
        url: mockUrl,
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(mockClient.connect).toHaveBeenCalled();
    });

    act(() => {
      result.current.disconnect();
    });

    expect(mockClient.disconnect).toHaveBeenCalled();
    expect(result.current.connected).toBe(false);
  });

  it('should execute code and return request ID', async () => {
    const mockClient = {
      connect: jest.fn().mockImplementation(function(this: any) {
        this._options?.onOpen?.();
        return Promise.resolve();
      }),
      disconnect: jest.fn(),
      send: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true),
      on: jest.fn().mockReturnValue(() => {}),
      _options: null as any,
    };

    (WebSocketClient as jest.Mock).mockImplementation((options) => {
      mockClient._options = options;
      return mockClient;
    });

    const { result } = renderHook(() =>
      useWebSocket({
        url: mockUrl,
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.connected).toBe(true);
    });

    let requestId: string = '';
    await act(async () => {
      requestId = await result.current.execute({
        language: 'python',
        files: { 'main.py': 'print("Hello")' },
      });
    });

    expect(requestId).toMatch(/^req_\d+_\d+$/);
    expect(mockClient.send).toHaveBeenCalled();
  });

  it('should return empty string when executing without connection', async () => {
    const mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
      send: jest.fn(),
      isConnected: jest.fn().mockReturnValue(false),
      on: jest.fn().mockReturnValue(() => {}),
    };

    (WebSocketClient as jest.Mock).mockImplementation(() => mockClient);

    const { result } = renderHook(() =>
      useWebSocket({
        url: mockUrl,
        enabled: false,
      })
    );

    let requestId: string = '';
    await act(async () => {
      requestId = await result.current.execute({
        language: 'python',
        files: { 'main.py': 'print("Hello")' },
      });
    });

    expect(requestId).toBe('');
    expect(mockClient.send).not.toHaveBeenCalled();
  });

  it('should cancel execution', async () => {
    const mockClient = {
      connect: jest.fn().mockImplementation(function(this: any) {
        this._options?.onOpen?.();
        return Promise.resolve();
      }),
      disconnect: jest.fn(),
      send: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true),
      on: jest.fn().mockReturnValue(() => {}),
      _options: null as any,
    };

    (WebSocketClient as jest.Mock).mockImplementation((options) => {
      mockClient._options = options;
      return mockClient;
    });

    const { result } = renderHook(() =>
      useWebSocket({
        url: mockUrl,
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.connected).toBe(true);
    });

    act(() => {
      result.current.cancel('req_123');
    });

    expect(mockClient.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'cancel',
        request_id: 'req_123',
      })
    );
  });

  it('should call onExecutionEvent callback', async () => {
    const onExecutionEvent = jest.fn();
    let registeredHandlers: Map<string, ((message: WebSocketMessage) => void)[]> = new Map();

    const mockClient = {
      connect: jest.fn().mockImplementation(function(this: any) {
        this._options?.onOpen?.();
        return Promise.resolve();
      }),
      disconnect: jest.fn(),
      send: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true),
      on: jest.fn().mockImplementation((type: string, handler: (message: WebSocketMessage) => void) => {
        if (!registeredHandlers.has(type)) {
          registeredHandlers.set(type, []);
        }
        registeredHandlers.get(type)!.push(handler);
        return () => {};
      }),
      _options: null as any,
    };

    (WebSocketClient as jest.Mock).mockImplementation((options) => {
      mockClient._options = options;
      return mockClient;
    });

    renderHook(() =>
      useWebSocket({
        url: mockUrl,
        enabled: true,
        onExecutionEvent,
      })
    );

    await waitFor(() => {
      expect(mockClient.connect).toHaveBeenCalled();
    });

    // Verify handlers were registered for execution events
    expect(registeredHandlers.has('execution_started')).toBe(true);
    expect(registeredHandlers.has('execution_output')).toBe(true);
    expect(registeredHandlers.has('execution_completed')).toBe(true);
    expect(registeredHandlers.has('execution_failed')).toBe(true);
    expect(registeredHandlers.has('execution_progress')).toBe(true);
  });

  it('should call onError callback', async () => {
    const onError = jest.fn();
    let errorHandler: ((message: WebSocketMessage) => void) | null = null;

    const mockClient = {
      connect: jest.fn().mockImplementation(function(this: any) {
        this._options?.onOpen?.();
        return Promise.resolve();
      }),
      disconnect: jest.fn(),
      send: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true),
      on: jest.fn().mockImplementation((type: string, handler: (message: WebSocketMessage) => void) => {
        if (type === 'error') {
          errorHandler = handler;
        }
        return () => {};
      }),
      _options: null as any,
    };

    (WebSocketClient as jest.Mock).mockImplementation((options) => {
      mockClient._options = options;
      return mockClient;
    });

    renderHook(() =>
      useWebSocket({
        url: mockUrl,
        enabled: true,
        onError,
      })
    );

    await waitFor(() => {
      expect(mockClient.connect).toHaveBeenCalled();
    });

    // Verify error handler was registered
    expect(errorHandler).not.toBeNull();
  });

  it('should update reconnecting state', async () => {
    const onReconnecting = jest.fn();

    const mockClient = {
      connect: jest.fn().mockImplementation(function(this: any) {
        this._options?.onOpen?.();
        return Promise.resolve();
      }),
      disconnect: jest.fn(),
      send: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true),
      on: jest.fn().mockReturnValue(() => {}),
      _options: null as any,
    };

    (WebSocketClient as jest.Mock).mockImplementation((options) => {
      mockClient._options = options;
      return mockClient;
    });

    const { result } = renderHook(() =>
      useWebSocket({
        url: mockUrl,
        enabled: true,
        onReconnecting,
      })
    );

    await waitFor(() => {
      expect(mockClient.connect).toHaveBeenCalled();
    });

    // Simulate reconnecting callback
    act(() => {
      mockClient._options?.onReconnecting?.(1);
    });

    expect(result.current.reconnecting).toBe(true);
    expect(onReconnecting).toHaveBeenCalledWith(1);
  });

  it('should disconnect on unmount', async () => {
    const mockClient = {
      connect: jest.fn().mockImplementation(function(this: any) {
        this._options?.onOpen?.();
        return Promise.resolve();
      }),
      disconnect: jest.fn(),
      send: jest.fn(),
      isConnected: jest.fn().mockReturnValue(true),
      on: jest.fn().mockReturnValue(() => {}),
      _options: null as any,
    };

    (WebSocketClient as jest.Mock).mockImplementation((options) => {
      mockClient._options = options;
      return mockClient;
    });

    const { unmount } = renderHook(() =>
      useWebSocket({
        url: mockUrl,
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(mockClient.connect).toHaveBeenCalled();
    });

    unmount();

    expect(mockClient.disconnect).toHaveBeenCalled();
  });
});
