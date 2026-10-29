import { act, fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider } from '@/contexts/ToastContext';
import { useToast } from '@/hooks/useToast';

function Buttons() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.success('saved')}>ok</button>
      <button onClick={() => toast.error('failed')}>err</button>
      <button onClick={() => toast.info('loaded', { action: { label: 'Undo', onClick: undo } })}>info</button>
      <button onClick={() => ['1', '2', '3', '4', '5'].forEach((n) => toast.warning(`w${n}`))}>many</button>
    </div>
  );
}
const undo = vi.fn();

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Toast', () => {
  it('announces errors assertively and others politely, then expires', () => {
    render(<ToastProvider><Buttons /></ToastProvider>);
    fireEvent.click(screen.getByText('ok'));
    fireEvent.click(screen.getByText('err'));
    expect(screen.getByRole('status', { hidden: true })).toHaveTextContent('saved');
    expect(screen.getByRole('alert', { hidden: true })).toHaveTextContent('failed');
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByText('saved')).toBeNull();
    expect(screen.getByText('failed')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.queryByText('failed')).toBeNull();
  });

  it('runs the action once and closes; hovering pauses expiry', () => {
    render(<ToastProvider><Buttons /></ToastProvider>);
    fireEvent.click(screen.getByText('info'));
    const toast = screen.getByRole('status', { hidden: true });
    fireEvent.mouseEnter(toast);
    act(() => vi.advanceTimersByTime(20000));
    expect(screen.getByText('loaded')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Undo', hidden: true }));
    expect(undo).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('loaded')).toBeNull();
  });

  it('keeps at most four toasts and closes one by its button', () => {
    render(<ToastProvider><Buttons /></ToastProvider>);
    fireEvent.click(screen.getByText('many'));
    expect(screen.queryByText('w1')).toBeNull();
    expect(screen.getAllByRole('status', { hidden: true })).toHaveLength(4);
    fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss notification', hidden: true })[0]);
    expect(screen.queryByText('w2')).toBeNull();
  });

  it('falls back to no-ops outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Buttons />);
    fireEvent.click(screen.getByText('ok'));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
