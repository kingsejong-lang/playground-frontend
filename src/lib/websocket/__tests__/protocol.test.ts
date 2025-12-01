import {
  createMessage,
  parseMessage,
  createExecuteMessage,
  createCancelMessage,
  createPingMessage,
  WebSocketMessage,
  ExecuteRequest,
} from '../protocol';

describe('WebSocket Protocol', () => {
  describe('createMessage', () => {
    it('should create a message with type and timestamp', () => {
      const message = createMessage('ping');

      expect(message.type).toBe('ping');
      expect(message.timestamp).toBeDefined();
      expect(new Date(message.timestamp).getTime()).not.toBeNaN();
    });

    it('should create a message with request_id', () => {
      const message = createMessage('execute', 'req_123');

      expect(message.type).toBe('execute');
      expect(message.request_id).toBe('req_123');
    });

    it('should create a message with data', () => {
      const data = { language: 'python', files: { 'main.py': 'print(1)' } };
      const message = createMessage('execute', 'req_123', data);

      expect(message.data).toEqual(data);
    });
  });

  describe('parseMessage', () => {
    it('should parse a valid JSON message', () => {
      const rawMessage = JSON.stringify({
        type: 'execution_output',
        request_id: 'req_123',
        data: { message: 'Hello, World!' },
        timestamp: '2025-01-01T00:00:00.000Z',
      });

      const message = parseMessage(rawMessage);

      expect(message.type).toBe('execution_output');
      expect(message.request_id).toBe('req_123');
      expect(message.data.message).toBe('Hello, World!');
    });

    it('should throw error for invalid JSON', () => {
      expect(() => parseMessage('invalid json')).toThrow();
    });
  });

  describe('createExecuteMessage', () => {
    it('should create an execute message with request', () => {
      const request: ExecuteRequest = {
        language: 'python',
        files: { 'main.py': 'print("Hello")' },
        timeout_seconds: 30,
      };

      const message = createExecuteMessage('req_456', request);

      expect(message.type).toBe('execute');
      expect(message.request_id).toBe('req_456');
      expect(message.data).toEqual(request);
      expect(message.data?.language).toBe('python');
      expect(message.data?.files['main.py']).toBe('print("Hello")');
    });

    it('should include optional fields', () => {
      const request: ExecuteRequest = {
        language: 'go',
        files: { 'main.go': 'package main' },
        args: '--verbose',
        stdin: 'input data',
        timeout_seconds: 60,
      };

      const message = createExecuteMessage('req_789', request);

      expect(message.data?.args).toBe('--verbose');
      expect(message.data?.stdin).toBe('input data');
      expect(message.data?.timeout_seconds).toBe(60);
    });
  });

  describe('createCancelMessage', () => {
    it('should create a cancel message', () => {
      const message = createCancelMessage('req_to_cancel');

      expect(message.type).toBe('cancel');
      expect(message.request_id).toBe('req_to_cancel');
      expect(message.data).toBeUndefined();
    });
  });

  describe('createPingMessage', () => {
    it('should create a ping message', () => {
      const message = createPingMessage();

      expect(message.type).toBe('ping');
      expect(message.request_id).toBeUndefined();
      expect(message.data).toBeUndefined();
      expect(message.timestamp).toBeDefined();
    });
  });

  describe('Message Types', () => {
    it('should support all client message types', () => {
      const clientTypes = ['execute', 'cancel', 'subscribe', 'unsubscribe', 'ping'];

      clientTypes.forEach((type) => {
        const message = createMessage(type as any);
        expect(message.type).toBe(type);
      });
    });

    it('should parse all server message types', () => {
      const serverTypes = [
        'execution_started',
        'execution_output',
        'execution_completed',
        'execution_failed',
        'execution_progress',
        'error',
        'pong',
      ];

      serverTypes.forEach((type) => {
        const raw = JSON.stringify({ type, timestamp: new Date().toISOString() });
        const message = parseMessage(raw);
        expect(message.type).toBe(type);
      });
    });
  });
});
