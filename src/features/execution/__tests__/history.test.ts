import {
  addHistoryItem,
  clearHistory,
  deleteHistoryItem,
  exportHistoryToJson,
  getHistoryItems,
  getHistoryStats,
  importHistoryFromJson,
  parseHistoryItems,
  searchHistory,
} from '../history';
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

  it('searches by language and output, exports and merges imports without duplicates', () => {
    const first = addHistoryItem({ language: 'python', code: 'print(1)', output: { ...emptyResult(), chunks: [{ stream: 'stdout', text: 'hello\n' }] }, success: true });
    expect(searchHistory('PYTHON')).toHaveLength(1);
    expect(searchHistory('hello')).toHaveLength(1);
    expect(searchHistory('nothing')).toHaveLength(0);
    expect(searchHistory('  ')).toHaveLength(1);
    const exported = exportHistoryToJson();
    clearHistory();
    importHistoryFromJson(exported);
    importHistoryFromJson(exported);
    expect(getHistoryItems().map((i) => i.id)).toEqual([first.id]);
    expect(() => importHistoryFromJson('{"a":1}')).toThrow('not an array');
  });

  it('deletes items and reports stats', () => {
    const a = addHistoryItem({ language: 'go', code: 'a', output: emptyResult(), success: true });
    addHistoryItem({ language: 'go', code: 'b', output: emptyResult(), success: false });
    expect(getHistoryStats()).toMatchObject({ total: 2, successful: 1, failed: 1, successRate: 50, byLanguage: { go: 2 } });
    deleteHistoryItem(a.id);
    expect(getHistoryItems()).toHaveLength(1);
  });

  it('keeps only the newest 100 runs', () => {
    for (let i = 0; i < 105; i++) addHistoryItem({ language: 'go', code: String(i), output: emptyResult(), success: true });
    expect(getHistoryItems()).toHaveLength(100);
  });
});
