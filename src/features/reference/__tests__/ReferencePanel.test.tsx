import { act, fireEvent, render, screen, within } from '@testing-library/react';
import ReferencePanel from '../ReferencePanel';
import { REFERENCE } from '../entries';

function open(props: Partial<Parameters<typeof ReferencePanel>[0]> = {}) {
  const p = { isOpen: true, onClose: vi.fn(), onInsert: vi.fn(), canInsert: true, ...props };
  render(<ReferencePanel {...p} />);
  return p;
}

const search = (value: string) => act(() => fireEvent.change(screen.getByLabelText('Search the reference'), { target: { value } }));

describe('ReferencePanel', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<ReferencePanel isOpen={false} onClose={vi.fn()} onInsert={vi.fn()} canInsert />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists every entry grouped by topic and focuses the search box', () => {
    open();
    expect(screen.getByLabelText('Search the reference')).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent(`${REFERENCE.length} entries`);
    expect(screen.getByRole('heading', { name: 'Conditions and loops' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'If / else' })).toBeInTheDocument();
  });

  it('filters as you type and inserts the example', async () => {
    const p = open();
    await search('reduce');
    expect(screen.getByRole('status')).toHaveTextContent('1 entry');
    const section = screen.getByRole('region', { name: 'Arrays' });
    expect(within(section).getByText('배열을 축약한다(초깃값, 함수)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Insert the Reduce example into the editor' }));
    expect(p.onInsert).toHaveBeenCalledWith(REFERENCE.find((e) => e.id === 'reduce')!.example);
  });

  it('explains an empty result and clears the search', async () => {
    open();
    await search('qqqq');
    expect(screen.getByText('Nothing matches "qqqq". Try another word or an English name such as for or print.')).toBeInTheDocument();
    // One clear button sits in the search box, the other under the message.
    const [inBox, inMessage] = screen.getAllByRole('button', { name: 'Clear search' });
    await act(() => fireEvent.click(inMessage));
    expect(screen.getByLabelText('Search the reference')).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent(`${REFERENCE.length} entries`);
    expect(inBox).not.toBeInTheDocument();
    await search('print');
    await act(() => fireEvent.click(screen.getByRole('button', { name: 'Clear search' })));
    expect(screen.getByLabelText('Search the reference')).toHaveValue('');
    expect(screen.getByLabelText('Search the reference')).toHaveFocus();
  });

  it('is read-only for other languages and offers to switch', () => {
    const onSwitchLanguage = vi.fn();
    open({ canInsert: false, onSwitchLanguage });
    expect(screen.queryByRole('button', { name: /^Insert the/ })).toBeNull();
    expect(screen.getByText(/Examples are KingSejong code/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Switch to KingSejong' }));
    expect(onSwitchLanguage).toHaveBeenCalled();
  });

  it('closes with Escape and the close button', () => {
    const p = open();
    fireEvent.keyDown(screen.getByLabelText('Search the reference'), { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(p.onClose).toHaveBeenCalledTimes(2);
  });
});
