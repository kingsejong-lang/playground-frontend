import { WebSocketClient, WebSocketClientOptions } from '../client';
import { WebSocketMessage } from '../protocol';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  private sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
  }

  send(data: string): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.sentMessages.push(data);
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code: code || 1000, reason: reason || '' } as CloseEvent);
    }
  }

  // Test helpers
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateMessage(data: WebSocketMessage): void {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) } as MessageEvent);
    }
  }

  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  simulateClose(code: number = 1000, reason: string = ''): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code, reason } as CloseEvent);
    }
  }

  getSentMessages(): string[] {
    return this.sentMessages;
  }
}

// Store WebSocket instances for test access
let mockWebSocketInstances: MockWebSocket[] = [];

// Replace global WebSocket with mock
(global as any).WebSocket = class extends MockWebSocket {
  constructor(url: string) {
    super(url);
    mockWebSocketInstances.push(this);
  }
};

describe('WebSocketClient', () => {
  beforeEach(() => {
    mockWebSocketInstances = [];
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const createClient = (options?: Partial<WebSocketClientOptions>): WebSocketClient => {
    return new WebSocketClient({
      url: 'ws://localhost:8080/ws',
      ...options,
    });
  };

  const getLatestMockWS = (): MockWebSocket => {
    return mockWebSocketInstances[mockWebSocketInstances.length - 1];
  };

  describe('connect', () => {
    it('should connect to WebSocket server', async () => {
      const onOpen = jest.fn();
      const client = createClient({ onOpen });

      const connectPromise = client.connect();

      // Simulate connection open
      getLatestMockWS().simulateOpen();
      await connectPromise;

      expect(onOpen).toHaveBeenCalled();
      expect(client.isConnected()).toBe(true);
    });

    it('should reject on connection error', async () => {
      const onError = jest.fn();
      const client = createClient({ onError });

      const connectPromise = client.connect();

      // Simulate error
      getLatestMockWS().simulateError();

      await expect(connectPromise).rejects.toBeDefined();
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should disconnect from WebSocket server', async () => {
      const onClose = jest.fn();
      const client = createClient({ onClose });

      const connectPromise = client.connect();
      getLatestMockWS().simulateOpen();
      await connectPromise;

      client.disconnect();

      expect(client.isConnected()).toBe(false);
    });

    it('should not attempt reconnection after intentional disconnect', async () => {
      const onReconnecting = jest.fn();
      const client = createClient({ onReconnecting });

      const connectPromise = client.connect();
      getLatestMockWS().simulateOpen();
      await connectPromise;

      client.disconnect();

      // Advance timers - should not trigger reconnection
      jest.advanceTimersByTime(30000);

      expect(onReconnecting).not.toHaveBeenCalled();
    });
  });

  describe('send', () => {
    it('should send message when connected', async () => {
      const client = createClient();

      const connectPromise = client.connect();
      const mockWS = getLatestMockWS();
      mockWS.simulateOpen();
      await connectPromise;

      const message: WebSocketMessage = {
        type: 'ping',
        timestamp: new Date().toISOString(),
      };

      client.send(message);

      const sentMessages = mockWS.getSentMessages();
      expect(sentMessages).toHaveLength(1);
      expect(JSON.parse(sentMessages[0])).toMatchObject({ type: 'ping' });
    });

    it('should throw error when not connected', () => {
      const client = createClient();

      const message: WebSocketMessage = {
        type: 'ping',
        timestamp: new Date().toISOString(),
      };

      expect(() => client.send(message)).toThrow('WebSocket not connected');
    });
  });

  describe('message handlers', () => {
    it('should call registered handlers for specific message types', async () => {
      const onMessage = jest.fn();
      const client = createClient({ onMessage });

      const handler = jest.fn();
      client.on('execution_output', handler);

      const connectPromise = client.connect();
      const mockWS = getLatestMockWS();
      mockWS.simulateOpen();
      await connectPromise;

      const message: WebSocketMessage = {
        type: 'execution_output',
        data: { message: 'Hello' },
        timestamp: new Date().toISOString(),
      };

      mockWS.simulateMessage(message);

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: 'execution_output' }));
      expect(onMessage).toHaveBeenCalled();
    });

    it('should allow unsubscribing from message handlers', async () => {
      const client = createClient();

      const handler = jest.fn();
      const unsubscribe = client.on('execution_output', handler);

      const connectPromise = client.connect();
      const mockWS = getLatestMockWS();
      mockWS.simulateOpen();
      await connectPromise;

      // Unsubscribe
      unsubscribe();

      const message: WebSocketMessage = {
        type: 'execution_output',
        data: { message: 'Hello' },
        timestamp: new Date().toISOString(),
      };

      mockWS.simulateMessage(message);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should support multiple handlers for the same type', async () => {
      const client = createClient();

      const handler1 = jest.fn();
      const handler2 = jest.fn();
      client.on('execution_completed', handler1);
      client.on('execution_completed', handler2);

      const connectPromise = client.connect();
      const mockWS = getLatestMockWS();
      mockWS.simulateOpen();
      await connectPromise;

      const message: WebSocketMessage = {
        type: 'execution_completed',
        timestamp: new Date().toISOString(),
      };

      mockWS.simulateMessage(message);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('heartbeat', () => {
    it('should send ping messages at specified interval', async () => {
      const client = createClient({ heartbeatInterval: 5000 });

      const connectPromise = client.connect();
      const mockWS = getLatestMockWS();
      mockWS.simulateOpen();
      await connectPromise;

      // Advance timers by heartbeat interval
      jest.advanceTimersByTime(5000);

      const sentMessages = mockWS.getSentMessages();
      expect(sentMessages.length).toBeGreaterThanOrEqual(1);
      expect(JSON.parse(sentMessages[0])).toMatchObject({ type: 'ping' });
    });

    it('should stop heartbeat on disconnect', async () => {
      const client = createClient({ heartbeatInterval: 5000 });

      const connectPromise = client.connect();
      const mockWS = getLatestMockWS();
      mockWS.simulateOpen();
      await connectPromise;

      client.disconnect();

      const messageCountBefore = mockWS.getSentMessages().length;

      // Advance timers - should not send more pings
      jest.advanceTimersByTime(10000);

      // Messages should not increase after disconnect
      expect(mockWS.getSentMessages().length).toBe(messageCountBefore);
    });
  });

  describe('reconnection', () => {
    it('should attempt reconnection on unexpected disconnect', async () => {
      const onReconnecting = jest.fn();
      const client = createClient({
        onReconnecting,
        reconnectDelay: 1000,
        maxReconnectAttempts: 3,
      });

      const connectPromise = client.connect();
      const mockWS = getLatestMockWS();
      mockWS.simulateOpen();
      await connectPromise;

      // Simulate unexpected close
      mockWS.simulateClose(1006, 'Connection lost');

      // Advance timers to trigger reconnection
      jest.advanceTimersByTime(2000);

      expect(onReconnecting).toHaveBeenCalledWith(1);
    });

    it('should stop reconnection after max attempts', async () => {
      const onReconnecting = jest.fn();
      const client = createClient({
        onReconnecting,
        reconnectDelay: 100,
        maxReconnectAttempts: 2,
      });

      const connectPromise = client.connect();
      let mockWS = getLatestMockWS();
      mockWS.simulateOpen();
      await connectPromise;

      // Simulate unexpected close
      mockWS.simulateClose(1006, 'Connection lost');

      // First reconnection attempt
      jest.advanceTimersByTime(200);
      mockWS = getLatestMockWS();
      mockWS.simulateClose(1006, 'Connection lost');

      // Second reconnection attempt
      jest.advanceTimersByTime(500);
      mockWS = getLatestMockWS();
      mockWS.simulateClose(1006, 'Connection lost');

      // Should not attempt third reconnection
      jest.advanceTimersByTime(2000);

      expect(onReconnecting).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff for reconnection', async () => {
      const onReconnecting = jest.fn();
      const client = createClient({
        onReconnecting,
        reconnectDelay: 1000,
        maxReconnectDelay: 30000,
        maxReconnectAttempts: 5,
      });

      const connectPromise = client.connect();
      let mockWS = getLatestMockWS();
      mockWS.simulateOpen();
      await connectPromise;

      // First disconnect
      mockWS.simulateClose(1006, 'Connection lost');

      // After first disconnect, reconnect after ~1000ms (plus jitter)
      jest.advanceTimersByTime(2000);
      expect(onReconnecting).toHaveBeenCalledWith(1);

      // Second disconnect
      mockWS = getLatestMockWS();
      mockWS.simulateClose(1006, 'Connection lost');

      // After second disconnect, reconnect after ~2000ms (plus jitter)
      jest.advanceTimersByTime(4000);
      expect(onReconnecting).toHaveBeenCalledWith(2);
    });
  });

  describe('isConnected', () => {
    it('should return false initially', () => {
      const client = createClient();
      expect(client.isConnected()).toBe(false);
    });

    it('should return true when connected', async () => {
      const client = createClient();

      const connectPromise = client.connect();
      getLatestMockWS().simulateOpen();
      await connectPromise;

      expect(client.isConnected()).toBe(true);
    });

    it('should return false after disconnect', async () => {
      const client = createClient();

      const connectPromise = client.connect();
      getLatestMockWS().simulateOpen();
      await connectPromise;

      client.disconnect();

      expect(client.isConnected()).toBe(false);
    });
  });
});
