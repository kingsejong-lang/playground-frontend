import { fireEvent, render, screen } from '@testing-library/react';
import { MAX_STDIN_BYTES, StdinPanel } from '../StdinPanel';

describe('StdinPanel', () => {
  it('shows a line count while collapsed and toggles open', () => {
    const onToggle = vi.fn();
    render(<StdinPanel value={'1\n2\n\n3'} onChange={vi.fn()} open={false} onToggle={onToggle} />);
    const toggle = screen.getByRole('button', { name: /Program input/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveTextContent('3 lines');
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalled();
  });

  it('edits the input and flags input over the byte limit', () => {
    const onChange = vi.fn();
    const { rerender } = render(<StdinPanel value="" onChange={onChange} open onToggle={vi.fn()} />);
    const box = screen.getByLabelText('Text passed to the program as standard input');
    fireEvent.change(box, { target: { value: '42' } });
    expect(onChange).toHaveBeenCalledWith('42');
    expect(box).not.toHaveAttribute('aria-invalid');

    // Multi-byte text is measured in UTF-8 bytes, not characters.
    rerender(<StdinPanel value={'가'.repeat(Math.ceil(MAX_STDIN_BYTES / 3) + 1)} onChange={onChange} open onToggle={vi.fn()} />);
    expect(screen.getByLabelText('Text passed to the program as standard input')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Input is over 64 KB and cannot be sent.')).toBeInTheDocument();
  });
});
