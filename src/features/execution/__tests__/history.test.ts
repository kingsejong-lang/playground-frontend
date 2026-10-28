import { addHistoryItem, getHistoryItems, importHistoryFromJson, parseHistoryItems, searchHistory } from '../history';
import { emptyResult } from '@/lib/rpc';

const KEY = 'playground_execution_history';

describe('history store', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips new ExecutionResult entries', () => {
    addHistoryItem({
      language: 'kingsejong',
      code: '출력(1)',
      output: { ...emptyResult(), status: 'succeeded', success: true, chunks: [{ stream: 'stdout', text: '1\n' }] },
      success: true,
    });
    const [item] = getHistoryItems();
    expect(item.output.chunks[0].text).toBe('1\n');
    expect(searchHistory('1')).toHaveLength(1);
  });

  it('converts legacy REST ExecuteResponse entries', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify([
        {
          id: 'hist_1',
          timestamp: '2025-01-01T00:00:00Z',
          language: 'python_3_12',
          code: 'print(1)',
          success: false,
          output: {
            request_id: 'r',
            success: false,
            events: [
              { kind: 'KIND_STDOUT', message: 'out', timestamp: 't' },
              { kind: 'KIND_STDERR', message: 'boom', timestamp: 't' },
            ],
            metrics: { compile_time_ms: 0, run_time_ms: 7, memory_bytes: 1024, cpu_percent: 1 },
            error: { code: 'RUNTIME', message: 'failed' },
          },
        },
      ])
    );
    const [item] = getHistoryItems();
    expect(item.output).toMatchObject({
      status: 'failed',
      chunks: [
        { stream: 'stdout', text: 'out' },
        { stream: 'stderr', text: 'boom' },
      ],
      message: 'RUNTIME: failed',
      metrics: { wallTimeMs: 7, peakMemoryBytes: 1024 },
    });
    expect(searchHistory('boom')).toHaveLength(1);
  });

  it('drops malformed entries instead of failing', () => {
    expect(parseHistoryItems([{ id: 1 }, 'x', null])).toEqual([]);
    localStorage.setItem(KEY, '{not json');
    expect(getHistoryItems()).toEqual([]);
  });

  it('rejects an import that is not an array', () => {
    expect(() => importHistoryFromJson('{"a":1}')).toThrow();
  });
});
