import { fireEvent, render, screen } from '@testing-library/react';
import FileTabs from '../FileTabs';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(), showToast: vi.fn() }));
vi.mock('@/hooks/useToast', () => ({ useToast: () => toast }));

const files = [
  { id: 'a', name: 'main.ksj', content: '' },
  { id: 'b', name: 'util.ksj', content: '' },
];

function setup(entryFileId: string | null = 'a') {
  const onSetEntry = vi.fn();
  render(
    <FileTabs
      files={files}
      activeFileId="a"
      onSelectFile={vi.fn()}
      onCloseFile={vi.fn()}
      onRenameFile={vi.fn()}
      onAddFile={vi.fn()}
      entryFileId={entryFileId}
      onSetEntry={onSetEntry}
      draftStatus="Draft saved 14:02"
    />
  );
  return { onSetEntry };
}

describe('FileTabs entry file', () => {
  it('marks the entry file for screen readers and sighted users', () => {
    setup('a');
    expect(screen.getByRole('button', { name: /main\.ksj\s*\(Entry file\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^util\.ksj$/ })).toBeInTheDocument();
  });

  it('sets the entry file from the context menu', () => {
    const { onSetEntry } = setup('a');
    fireEvent.contextMenu(screen.getByRole('button', { name: /^util\.ksj$/ }));
    // jsdom has no popover API, so the menu stays "hidden" to role queries there.
    fireEvent.click(screen.getByRole('button', { name: 'Set as entry file', hidden: true }));
    expect(onSetEntry).toHaveBeenCalledWith('b');
  });

  it('shows the quiet draft confirmation', () => {
    setup();
    expect(screen.getByRole('status')).toHaveTextContent('Draft saved 14:02');
  });
});

describe('FileTabs editing', () => {
  function full(list = files) {
    const props = {
      onSelectFile: vi.fn(),
      onCloseFile: vi.fn(),
      onRenameFile: vi.fn(),
      onAddFile: vi.fn(),
      onToggleFileTree: vi.fn(),
      onSetEntry: vi.fn(),
    };
    render(<FileTabs files={list} activeFileId="a" entryFileId="a" fileTreeOpen {...props} />);
    return props;
  }
  beforeEach(() => vi.clearAllMocks());

  it('selects, adds and toggles the file list', () => {
    const p = full();
    fireEvent.click(screen.getByRole('button', { name: /^util\.ksj$/ }));
    expect(p.onSelectFile).toHaveBeenCalledWith('b');
    fireEvent.click(screen.getByRole('button', { name: 'New file' }));
    expect(p.onAddFile).toHaveBeenCalled();
    const toggle = screen.getByRole('button', { name: 'Show or hide the file list' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggle);
    expect(p.onToggleFileTree).toHaveBeenCalled();
  });

  it('renames in place and refuses a name already in use', () => {
    const p = full();
    fireEvent.doubleClick(screen.getByRole('button', { name: /^util\.ksj$/ }));
    const input = screen.getByLabelText('New name for util.ksj');
    fireEvent.change(input, { target: { value: ' lib.ksj ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(p.onRenameFile).toHaveBeenCalledWith('b', 'lib.ksj');
    expect(toast.success).toHaveBeenCalledWith('File renamed');

    fireEvent.keyDown(screen.getByRole('button', { name: /^util\.ksj$/ }), { key: 'F2' });
    const again = screen.getByLabelText('New name for util.ksj');
    fireEvent.change(again, { target: { value: 'main.ksj' } });
    fireEvent.blur(again);
    expect(toast.error).toHaveBeenCalledWith('A file with that name already exists');
    fireEvent.keyDown(screen.getByRole('button', { name: /^util\.ksj$/ }), { key: 'F2' });
    fireEvent.keyDown(screen.getByLabelText('New name for util.ksj'), { key: 'Escape' });
    expect(p.onRenameFile).toHaveBeenCalledTimes(1);
  });

  it('renames and closes from the context menu', () => {
    const p = full();
    fireEvent.contextMenu(screen.getByRole('button', { name: /^util\.ksj$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Rename', hidden: true }));
    expect(screen.getByLabelText('New name for util.ksj')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByLabelText('New name for util.ksj'), { key: 'Escape' });
    fireEvent.contextMenu(screen.getByRole('button', { name: /^util\.ksj$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Close', hidden: true }));
    expect(p.onCloseFile).toHaveBeenCalledWith('b');
  });

  it('keeps the last open file', () => {
    const p = full([files[0]]);
    // A single file is not marked as the entry file.
    expect(screen.getByRole('button', { name: /^main\.ksj$/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close main.ksj' }));
    expect(p.onCloseFile).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalledWith('Keep at least one file open');
  });
});
