import { act, fireEvent, render, screen } from '@testing-library/react';
import { ShareModal } from '../ShareModal';

describe('ShareModal', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows the link and embed code and confirms each copy for two seconds', async () => {
    const onCopy = vi.fn();
    const onCopyEmbed = vi.fn();
    const onClose = vi.fn();
    render(<ShareModal shareUrl="https://play.example/s/abc" embedCode="<iframe></iframe>" onCopy={onCopy} onCopyEmbed={onCopyEmbed} onClose={onClose} />);
    expect(screen.getByLabelText('Share link')).toHaveValue('https://play.example/s/abc');
    expect(screen.getByLabelText('Embed code')).toHaveValue('<iframe></iframe>');

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy link', hidden: true })));
    expect(onCopy).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Link copied', hidden: true })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole('button', { name: 'Copy link', hidden: true })).toBeInTheDocument();

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy embed code', hidden: true })));
    expect(onCopyEmbed).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Embed code copied', hidden: true })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Close', hidden: true }).at(-1)!);
    expect(onClose).toHaveBeenCalled();
  });
});
