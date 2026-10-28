import { fireEvent, render, screen } from '@testing-library/react';
import FileTabs from '../FileTabs';

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
