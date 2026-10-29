import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { emptyResult, type ExecutionResult } from '@/lib/rpc';
import OutputPanel from '../OutputPanel';

const toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(), showToast: vi.fn() };
vi.mock('@/hooks/useToast', () => ({ useToast: () => toast }));

const result = (over: Partial<ExecutionResult>): ExecutionResult => ({ ...emptyResult(), ...over });
const panel = () => screen.getByRole('region', { name: 'Output' });

describe('OutputPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('teaches the Run shortcut and offers templates before the first run', () => {
    const onOpenTemplates = vi.fn();
    render(<OutputPanel output={null} loading={false} error={null} runKeys={['Ctrl', 'Enter']} onOpenTemplates={onOpenTemplates} />);
    expect(panel()).toHaveTextContent('Run your code to see the output here');
    fireEvent.click(screen.getByRole('button', { name: /Open a template/ }));
    expect(onOpenTemplates).toHaveBeenCalled();
  });

  it('shows queue position and compile phase while a run is live, with a live elapsed time', () => {
    vi.useFakeTimers();
    const { rerender } = render(<OutputPanel output={result({ status: 'queued', queuePosition: 2 })} loading error={null} />);
    expect(panel()).toHaveTextContent('Position 2 in queue');
    expect(screen.getByRole('status')).toHaveTextContent('Waiting in queue, Position 2 in queue');
    rerender(<OutputPanel output={result({ status: 'running', phase: 'compile' })} loading streaming error={null} />);
    act(() => vi.advanceTimersByTime(1500));
    expect(panel()).toHaveTextContent('Compiling');
    expect(panel()).toHaveTextContent(/1(\.\d)?s/);
    vi.useRealTimers();
  });

  it('summarises a finished run with metrics, help text and the server reason', () => {
    render(
      <OutputPanel
        output={result({
          status: 'time_limit_exceeded',
          exitCode: 137,
          message: 'wall time 10 s',
          metrics: { wallTimeMs: 10_000, cpuTimeMs: 9_500, peakMemoryBytes: 3 * 1024 * 1024, stdoutBytes: 0, stderrBytes: 0, queueTimeMs: 1200 },
        })}
        loading={false}
        error={null}
      />
    );
    expect(panel()).toHaveTextContent('Time limit exceeded');
    expect(panel()).toHaveTextContent('exit 137');
    expect(panel()).toHaveTextContent('Look for a loop that never ends');
    expect(panel()).toHaveTextContent('wall time 10 s');
    expect(panel()).toHaveTextContent('10s');
    expect(panel()).toHaveTextContent('3 MB');
    expect(panel()).toHaveTextContent('1.2s');
  });

  it('hides memory that was not measured', () => {
    render(<OutputPanel output={result({ status: 'succeeded', success: true, metrics: { wallTimeMs: 5, cpuTimeMs: 0, peakMemoryBytes: 0, stdoutBytes: 0, stderrBytes: 0, queueTimeMs: 0 } })} loading={false} error={null} />);
    expect(panel()).not.toHaveTextContent('Memory');
  });

  it('lists diagnostics and jumps to them; error output locations are links too', () => {
    const onJumpTo = vi.fn();
    render(
      <OutputPanel
        output={result({
          status: 'compile_error',
          diagnostics: [
            { severity: 'error', message: 'unknown name', path: 'main.ksj', line: 2, column: 1, code: 'E1' },
            { severity: 'warning', message: 'unused', path: 'util.ksj', line: 0, column: 0, code: '' },
          ],
          chunks: [{ stream: 'stderr', text: 'boom at ./main.go:7:9\n' }],
        })}
        loading={false}
        error={null}
        onJumpTo={onJumpTo}
      />
    );
    expect(panel()).toHaveTextContent('2 problems');
    fireEvent.click(screen.getByRole('button', { name: 'Go to main.ksj:2:1 in the editor' }));
    expect(onJumpTo).toHaveBeenLastCalledWith(expect.objectContaining({ path: 'main.ksj', line: 2 }));
    // A diagnostic without a line is shown but not clickable.
    expect(screen.queryByRole('button', { name: /util\.ksj/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: './main.go:7:9' }));
    expect(onJumpTo).toHaveBeenLastCalledWith(expect.objectContaining({ path: 'main.go', line: 7, column: 9 }));
  });

  it('explains truncation, lost events and reconnects', () => {
    render(
      <OutputPanel
        output={result({ status: 'output_limit_exceeded', truncated: [{ stream: 'stdout', droppedBytes: 2048 }], gaps: 3, reconnected: true })}
        loading={false}
        error={null}
      />
    );
    expect(panel()).toHaveTextContent('2 KB of standard output were dropped');
    expect(panel()).toHaveTextContent('3 events missing');
    expect(panel()).toHaveTextContent('The connection dropped');
  });

  it('shows "lost connection" for an unknown final status', () => {
    render(<OutputPanel output={result({ status: 'unknown', message: 'Lost connection to the server; the final status is unknown.' })} loading={false} error={null} />);
    expect(panel()).toHaveTextContent('Lost connection to the server');
  });

  it('shows a waiting error as a warning with a countdown before retry', () => {
    vi.useFakeTimers();
    const onRetry = vi.fn();
    render(<OutputPanel output={null} loading={false} error="Too many runs in a short time. Try again in 2 s." errorKind="rate_limited" retryAfterSeconds={2} onRetry={onRetry} />);
    const retry = screen.getByRole('button', { name: 'Try again (2)' });
    expect(retry).toBeDisabled();
    expect(panel()).toHaveTextContent('Try again in 2 s.');
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole('button', { name: 'Try again (1)' })).toBeDisabled();
    act(() => vi.advanceTimersByTime(1000));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('shows non-retryable errors without a retry button and the backend-down banner with reconnect', () => {
    const onRetry = vi.fn();
    const { rerender } = render(<OutputPanel output={null} loading={false} error="The request is invalid: too long" errorKind="validation" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('too long');
    expect(screen.queryByRole('button', { name: /Try again/ })).toBeNull();
    rerender(<OutputPanel output={null} loading={false} error={null} backendIssue={{ message: 'down', onRetry }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('searches, numbers lines, copies, downloads and clears the output', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const onClear = vi.fn();
    render(
      <OutputPanel
        output={result({ status: 'succeeded', success: true, chunks: [{ stream: 'stdout', text: 'tick\ntock\ntick\n' }] })}
        loading={false}
        error={null}
        onClear={onClear}
      />
    );
    const tools = within(screen.getByRole('toolbar', { name: 'Output tools' }));
    fireEvent.click(tools.getByRole('button', { name: 'Search output' }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search output' }), { target: { value: 'TICK' } });
    expect(panel()).toHaveTextContent('2 matches');
    fireEvent.click(tools.getByRole('button', { name: 'Line numbers' }));
    expect(tools.getByRole('button', { name: 'Line numbers' })).toHaveAttribute('aria-pressed', 'true');
    expect(panel()).toHaveTextContent('123');
    fireEvent.click(tools.getByRole('button', { name: 'Follow new output' }));
    expect(tools.getByRole('button', { name: 'Follow new output' })).toHaveAttribute('aria-pressed', 'false');
    await act(async () => fireEvent.click(tools.getByRole('button', { name: 'Copy output' })));
    expect(writeText).toHaveBeenCalledWith('tick\ntock\ntick\n');
    expect(toast.success).toHaveBeenCalledWith('Output copied');
    fireEvent.click(tools.getByRole('button', { name: 'Download output' }));
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Output downloaded');
    fireEvent.click(tools.getByRole('button', { name: 'Clear output' }));
    expect(onClear).toHaveBeenCalled();
  });

  it('warns instead of copying an empty output and reports clipboard failures', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    const { rerender } = render(<OutputPanel output={result({ status: 'succeeded', success: true })} loading={false} error={null} />);
    const tools = within(screen.getByRole('toolbar', { name: 'Output tools' }));
    await act(async () => fireEvent.click(tools.getByRole('button', { name: 'Copy output' })));
    expect(toast.warning).toHaveBeenCalledWith('There is no output yet');
    fireEvent.click(tools.getByRole('button', { name: 'Download output' }));
    expect(toast.warning).toHaveBeenCalledTimes(2);
    rerender(<OutputPanel output={result({ status: 'succeeded', success: true, chunks: [{ stream: 'stdout', text: 'x' }] })} loading={false} error={null} />);
    await act(async () => fireEvent.click(tools.getByRole('button', { name: 'Copy output' })));
    expect(toast.error).toHaveBeenCalledWith('Could not copy to the clipboard');
  });
});
