/**
 * CodeEditor wiring, with @monaco-editor/react replaced by a stub that calls
 * beforeMount/onMount with fake editor and Monaco objects.
 */
import { act, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import CodeEditor, { EditorSkeleton, type EditorCommand } from '../CodeEditor';

const h = vi.hoisted(() => {
  const actions: { id: string; label: string; keybindings?: number[]; contextMenuGroupId?: string; run: () => void; dispose: ReturnType<typeof vi.fn> }[] = [];
  const model = { getLineCount: () => 3, getLineMaxColumn: (line: number) => [0, 10, 5, 1][line] };
  const editor = {
    addAction: vi.fn((a: Omit<(typeof actions)[number], 'dispose'>) => {
      const entry = { ...a, dispose: vi.fn() };
      actions.push(entry);
      return entry;
    }),
    getModel: () => model,
    revealPositionInCenter: vi.fn(),
    setPosition: vi.fn(),
    focus: vi.fn(),
  };
  const monaco = {
    KeyMod: { CtrlCmd: 2048 },
    KeyCode: { Enter: 3, Period: 87, KeyS: 49 },
    MarkerSeverity: { Error: 8, Warning: 4, Info: 2 },
    editor: { defineTheme: vi.fn(), setModelMarkers: vi.fn() },
    languages: {} as Record<string, unknown>,
  };
  const last: { props?: Record<string, unknown> } = {};
  return { actions, editor, monaco, model, last };
});

vi.mock('@monaco-editor/react', () => ({
  loader: { config: vi.fn() },
  Editor: (props: Record<string, unknown> & { beforeMount: (m: unknown) => void; onMount: (e: unknown, m: unknown) => void }) => {
    h.last.props = props;
    useEffect(() => {
      props.beforeMount(h.monaco);
      props.onMount(h.editor, h.monaco);
      // Mount once, like the real editor.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return <div data-testid="editor" />;
  },
}));

const register = vi.hoisted(() => vi.fn());
vi.mock('@/features/editor/monaco/kingsejong-language', () => ({ kingsejongLanguageId: 'kingsejong', registerKingsejongLanguage: register }));

beforeEach(() => {
  h.actions.length = 0;
  vi.clearAllMocks();
});

const commands = (label = 'Run code'): EditorCommand[] => [
  { id: 'run', label, run: vi.fn(), key: 'run', contextMenu: true },
  { id: 'templates', label: 'Templates', run: vi.fn() },
];

describe('CodeEditor', () => {
  it('maps playground languages to Monaco ids and passes editor options', () => {
    const { rerender } = render(<CodeEditor value="" onChange={vi.fn()} language="kingsejong" minimap={false} tabSize={4} ariaLabel="Code" />);
    expect(h.last.props).toMatchObject({ language: 'kingsejong', theme: 'code-sanctuary-dark', options: expect.objectContaining({ tabSize: 4, minimap: { enabled: false }, ariaLabel: 'Code' }) });
    for (const [lang, id] of [['python3', 'python'], ['go1.22', 'go'], ['rust', 'plaintext']]) {
      rerender(<CodeEditor value="" onChange={vi.fn()} language={lang} />);
      expect(h.last.props?.language).toBe(id);
    }
  });

  it('defines both themes and registers the language once', () => {
    render(<CodeEditor value="" onChange={vi.fn()} language="kingsejong" />);
    expect(h.monaco.editor.defineTheme).toHaveBeenCalledWith('code-sanctuary-dark', expect.anything());
    expect(h.monaco.editor.defineTheme).toHaveBeenCalledWith('code-sanctuary-light', expect.anything());
    expect(register).toHaveBeenCalledTimes(1);
  });

  it('logs and carries on when language registration fails', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    register.mockImplementationOnce(() => {
      throw new Error('bad grammar');
    });
    render(<CodeEditor value="" onChange={vi.fn()} language="kingsejong" />);
    expect(spy).toHaveBeenCalledWith('Failed to register Kingsejong language:', expect.any(Error));
    expect(screen.getByTestId('editor')).toBeInTheDocument();
    spy.mockRestore();
  });

  it('reports edits, treating an undefined value as empty', () => {
    const onChange = vi.fn();
    render(<CodeEditor value="x" onChange={onChange} language="go" />);
    (h.last.props?.onChange as (v?: string) => void)('y');
    (h.last.props?.onChange as (v?: string) => void)(undefined);
    expect(onChange.mock.calls).toEqual([['y'], ['']]);
  });

  it('adds palette actions with key bindings and re-registers when labels change', () => {
    const first = commands();
    const { rerender } = render(<CodeEditor value="" onChange={vi.fn()} language="go" commands={first} />);
    expect(h.actions.map((a) => [a.id, a.keybindings, a.contextMenuGroupId])).toEqual([
      ['playground.run', [2048 | 3], 'playground'],
      ['playground.templates', undefined, undefined],
    ]);
    h.actions[1].run();
    expect(first[1].run).toHaveBeenCalled();

    // Same ids and labels: nothing re-registered, but the latest handlers run.
    const same = commands();
    rerender(<CodeEditor value="" onChange={vi.fn()} language="go" commands={same} />);
    expect(h.editor.addAction).toHaveBeenCalledTimes(2);
    h.actions[0].run();
    expect(same[0].run).toHaveBeenCalled();

    rerender(<CodeEditor value="" onChange={vi.fn()} language="go" commands={commands('코드 실행')} />);
    expect(h.actions[0].dispose).toHaveBeenCalled();
    expect(h.actions.at(-2)?.label).toBe('코드 실행');
  });

  it('turns diagnostics into markers clamped to the file', () => {
    render(
      <CodeEditor
        value="a\nb\nc"
        onChange={vi.fn()}
        language="go"
        diagnostics={[
          { severity: 'error', message: 'undefined: x', path: 'main.go', line: 2, column: 3, code: 'E1' },
          { severity: 'warning', message: 'past the end', path: 'main.go', line: 9, column: 0, code: '' },
          { severity: 'info', message: 'no position', path: 'main.go', line: 0, column: 0, code: '' },
        ]}
      />
    );
    const [, owner, markers] = h.monaco.editor.setModelMarkers.mock.calls.at(-1)!;
    expect(owner).toBe('playground-run');
    expect(markers).toEqual([
      { severity: 8, message: 'undefined: x', code: 'E1', startLineNumber: 2, startColumn: 3, endLineNumber: 2, endColumn: 5 },
      { severity: 4, message: 'past the end', code: undefined, startLineNumber: 3, startColumn: 1, endLineNumber: 3, endColumn: 2 },
    ]);
  });

  it('moves the cursor for each reveal request', () => {
    const { rerender } = render(<CodeEditor value="" onChange={vi.fn()} language="go" />);
    rerender(<CodeEditor value="" onChange={vi.fn()} language="go" reveal={{ line: 4, column: 0, nonce: 1 }} />);
    expect(h.editor.setPosition).toHaveBeenCalledWith({ lineNumber: 4, column: 1 });
    expect(h.editor.focus).toHaveBeenCalled();
    rerender(<CodeEditor value="" onChange={vi.fn()} language="go" reveal={{ line: 4, column: 0, nonce: 2 }} />);
    expect(h.editor.revealPositionInCenter).toHaveBeenCalledTimes(2);
  });
});

describe('EditorSkeleton', () => {
  it('is a busy status with an optional label', () => {
    act(() => {
      render(<EditorSkeleton label="Loading editor" />);
    });
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Loading editor')).toBeInTheDocument();
  });
});
