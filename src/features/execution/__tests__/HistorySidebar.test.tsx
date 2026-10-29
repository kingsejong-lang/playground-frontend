import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { Language } from '@kingsejong-lang/playground-proto';
import { emptyResult } from '@/lib/rpc';
import HistorySidebar from '../HistorySidebar';
import { addHistoryItem, getHistoryItems } from '../history';

const toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(), showToast: vi.fn() };
vi.mock('@/hooks/useToast', () => ({ useToast: () => toast }));

const languages = [
  { id: 'kingsejong', displayName: '킹세종' },
  { id: 'python', displayName: 'Python' },
] as Language[];

function seed() {
  addHistoryItem({ language: 'kingsejong', code: '출력("ok")', success: true, output: { ...emptyResult(), status: 'succeeded', success: true, metrics: { wallTimeMs: 12, cpuTimeMs: 0, peakMemoryBytes: 0, stdoutBytes: 0, stderrBytes: 0, queueTimeMs: 0 } } });
  addHistoryItem({ language: 'python', code: 'raise X', success: false, output: { ...emptyResult(), status: 'failed', success: false } });
}

function open() {
  const onLoadHistory = vi.fn();
  const onClose = vi.fn();
  render(<HistorySidebar isOpen onClose={onClose} onLoadHistory={onLoadHistory} languages={languages} />);
  return { onLoadHistory, onClose };
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('HistorySidebar', () => {
  it('shows the empty state with export and clear disabled', () => {
    open();
    expect(screen.getByText('No runs yet. Each run you make is saved here.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export', hidden: true })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear all', hidden: true })).toBeDisabled();
  });

  it('lists runs with stats, filters them and opens one', () => {
    seed();
    const { onLoadHistory, onClose } = open();
    const stat = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling ?? screen.getByText(label, { selector: 'dt' }).parentElement!.querySelector('dd');
    expect(stat('Total')).toHaveTextContent('2');
    expect(screen.getByText('12ms')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter by result'), { target: { value: 'failed' } });
    expect(screen.queryByRole('button', { name: /킹세종, Succeeded/, hidden: true })).toBeNull();
    fireEvent.change(screen.getByLabelText('Filter by result'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Filter by language'), { target: { value: 'python' } });
    expect(screen.getAllByRole('button', { name: /^Open this run/, hidden: true })).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('Search history'), { target: { value: 'zzz' } });
    expect(screen.getByText('No runs match these filters.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search history'), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: /Python, Failed, raise X/, hidden: true }));
    expect(onLoadHistory).toHaveBeenCalledWith(expect.objectContaining({ code: 'raise X' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('deletes a single run', () => {
    seed();
    open();
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete this run', hidden: true })[0]);
    expect(getHistoryItems()).toHaveLength(1);
    expect(toast.success).toHaveBeenCalledWith('Run deleted');
  });

  it('asks before clearing everything', () => {
    seed();
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Clear all', hidden: true }));
    const confirm = screen.getByRole('alertdialog', { hidden: true });
    expect(confirm).toHaveTextContent('This permanently deletes 2 runs.');
    fireEvent.click(within(confirm).getByRole('button', { name: 'Cancel', hidden: true }));
    expect(getHistoryItems()).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Clear all', hidden: true }));
    fireEvent.click(within(screen.getByRole('alertdialog', { hidden: true })).getByRole('button', { name: 'Clear all', hidden: true }));
    expect(getHistoryItems()).toHaveLength(0);
    expect(toast.success).toHaveBeenCalledWith('History cleared');
  });

  it('exports and imports history files', async () => {
    seed();
    const createObjectURL = vi.fn(() => 'blob:x');
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Export', hidden: true }));
    expect(toast.success).toHaveBeenCalledWith('History exported');
    click.mockRestore();

    const json = JSON.stringify(getHistoryItems().map((item) => ({ ...item, id: `${item.id}-copy`, code: `${item.code} copy` })));
    const input = screen.getByLabelText('Choose a history JSON file');
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File([json], 'history.json', { type: 'application/json' })] } });
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(toast.success).toHaveBeenCalledWith('History imported');
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File(['{bad'], 'bad.json')] } });
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(toast.error).toHaveBeenCalledWith('Could not import that file');
  });
});

describe('HistorySidebar multi-file runs', () => {
  it('names the entry file and how many other files the run had, and restores the whole run', () => {
    localStorage.clear();
    addHistoryItem({
      language: 'kingsejong',
      files: [
        { name: 'main.ksj', content: '가져오기 "util"' },
        { name: 'util.ksj', content: 'x = 1' },
        { name: 'b.ksj', content: 'y = 2' },
      ],
      entryFile: 'main.ksj',
      code: '가져오기 "util"',
      success: true,
      output: { ...emptyResult(), status: 'succeeded', success: true },
    });
    const { onLoadHistory } = open();
    expect(screen.getByText('main.ksj + 2 more files')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /main\.ksj \+ 2 more files/, hidden: true }));
    expect(onLoadHistory).toHaveBeenCalledWith(expect.objectContaining({ entryFile: 'main.ksj', files: expect.arrayContaining([expect.objectContaining({ name: 'b.ksj' })]) }));
  });
});
