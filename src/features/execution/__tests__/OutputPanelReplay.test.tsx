import { render, screen } from '@testing-library/react';
import { emptyResult, type ExecutionResult } from '@/lib/rpc';
import OutputPanel from '../OutputPanel';

vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(), showToast: vi.fn() }) }));

function show(output: Partial<ExecutionResult>) {
  render(
    <OutputPanel
      output={{ ...emptyResult(), status: 'succeeded', success: true, exitCode: 0, chunks: [{ stream: 'stdout', text: 'ok\n' }], ...output }}
      loading={false}
      error={null}
      streaming={false}
      onClear={vi.fn()}
      onJumpTo={vi.fn()}
      runKeys={['Ctrl', 'Enter']}
    />
  );
}

describe('OutputPanel replay notices', () => {
  it('says the stream was resumed', () => {
    show({ resumed: true });
    expect(screen.getByRole('note')).toHaveTextContent('Reconnected · output from while the connection was down was replayed.');
  });

  it('explains events the server no longer had instead of the plain reconnect note', () => {
    show({ resumed: true, replayGap: 2 });
    const notes = screen.getAllByRole('note');
    expect(notes).toHaveLength(1);
    expect(notes[0]).toHaveTextContent('Reconnected, but 2 earlier events were no longer kept on the server and cannot be shown.');
  });

  it('keeps the GetExecution fallback note', () => {
    show({ reconnected: true });
    expect(screen.getByRole('note')).toHaveTextContent('The connection dropped; the final status was fetched afterwards.');
  });
});
