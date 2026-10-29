import { fireEvent, render, screen } from '@testing-library/react';
import FileTree from '../FileTree';
import type { FileItem } from '../useFiles';

const toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(), showToast: vi.fn() };
vi.mock('@/hooks/useToast', () => ({ useToast: () => toast }));

const files = [
  { id: 'a', name: 'main.ksj', content: '' },
  { id: 'b', name: 'util.ksj', content: '' },
] as FileItem[];

function renderTree(overrides: Partial<Parameters<typeof FileTree>[0]> = {}) {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    files,
    activeFileId: 'a',
    onSelectFile: vi.fn(),
    onAddFile: vi.fn(),
    onRenameFile: vi.fn(),
    onDeleteFile: vi.fn(),
    entryFileId: 'a',
    onSetEntry: vi.fn(),
    ...overrides,
  };
  render(<FileTree {...props} />);
  return props;
}

beforeEach(() => vi.clearAllMocks());

describe('FileTree', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <FileTree isOpen={false} onClose={vi.fn()} files={files} activeFileId={null} onSelectFile={vi.fn()} onAddFile={vi.fn()} onRenameFile={vi.fn()} onDeleteFile={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('marks the active and entry files and selects on click', () => {
    const p = renderTree();
    const main = screen.getByRole('button', { name: /^main\.ksj/ });
    expect(main).toHaveAttribute('aria-current', 'true');
    expect(main).toHaveTextContent('Entry file');
    expect(screen.getByText('2 files')).toBeInTheDocument();
    // The entry file has no "set as entry" button; the other file does.
    expect(screen.queryByRole('button', { name: 'Set as entry file: main.ksj' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Set as entry file: util.ksj' }));
    expect(p.onSetEntry).toHaveBeenCalledWith('b');
    fireEvent.click(screen.getByRole('button', { name: 'util.ksj' }));
    expect(p.onSelectFile).toHaveBeenCalledWith('b');
  });

  it('renames with Enter and rejects duplicate names', () => {
    const p = renderTree();
    fireEvent.keyDown(screen.getByRole('button', { name: 'util.ksj' }), { key: 'F2' });
    const input = screen.getByLabelText('New name for util.ksj');
    fireEvent.change(input, { target: { value: 'helpers.ksj' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(p.onRenameFile).toHaveBeenCalledWith('b', 'helpers.ksj');
    expect(toast.success).toHaveBeenCalledWith('File renamed');

    fireEvent.doubleClick(screen.getByRole('button', { name: 'util.ksj' }));
    const again = screen.getByLabelText('New name for util.ksj');
    fireEvent.change(again, { target: { value: 'main.ksj' } });
    fireEvent.blur(again);
    expect(toast.error).toHaveBeenCalledWith('A file with that name already exists');
    expect(p.onRenameFile).toHaveBeenCalledTimes(1);
  });

  it('Escape or an unchanged name cancels the rename', () => {
    const p = renderTree();
    fireEvent.click(screen.getByRole('button', { name: 'Rename: util.ksj' }));
    fireEvent.keyDown(screen.getByLabelText('New name for util.ksj'), { key: 'Escape' });
    expect(screen.queryByLabelText('New name for util.ksj')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Rename: util.ksj' }));
    fireEvent.keyDown(screen.getByLabelText('New name for util.ksj'), { key: 'Enter' });
    expect(p.onRenameFile).not.toHaveBeenCalled();
  });

  it('deletes a file but keeps the last one', () => {
    const p = renderTree();
    fireEvent.click(screen.getByRole('button', { name: 'Delete: util.ksj' }));
    expect(p.onDeleteFile).toHaveBeenCalledWith('b');
    expect(toast.success).toHaveBeenCalledWith('File deleted');
  });

  it('warns instead of deleting the only file', () => {
    const p = renderTree({ files: [files[0]] });
    fireEvent.click(screen.getByRole('button', { name: 'Delete: main.ksj' }));
    expect(p.onDeleteFile).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalledWith('Keep at least one file open');
  });

  it('offers to add a file when empty and closes from the header', () => {
    const p = renderTree({ files: [] });
    expect(screen.getByText('No files yet')).toBeInTheDocument();
    screen.getAllByRole('button', { name: 'New file' }).forEach((b) => fireEvent.click(b));
    expect(p.onAddFile).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(p.onClose).toHaveBeenCalled();
  });
});
