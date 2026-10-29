/**
 * Provider logic for the KingSejong Monaco language, run against a minimal
 * stand-in for the Monaco API and text model (the real editor needs a browser).
 */
import type * as monacoEditor from 'monaco-editor';
import {
  createKingsejongCompletionProvider,
  createKingsejongFormattingProvider,
  createKingsejongHoverProvider,
  createKingsejongOnTypeFormattingProvider,
  createKingsejongRangeFormattingProvider,
  kingsejongLanguageId,
  registerKingsejongLanguage,
} from '../kingsejong-language';

class Range {
  constructor(
    public startLineNumber: number,
    public startColumn: number,
    public endLineNumber: number,
    public endColumn: number
  ) {}
}

function stubMonaco() {
  const languages = {
    CompletionItemKind: { Snippet: 27, Keyword: 17, Function: 1 },
    CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
    register: vi.fn(),
    setLanguageConfiguration: vi.fn(),
    setMonarchTokensProvider: vi.fn(),
    registerCompletionItemProvider: vi.fn(),
    registerHoverProvider: vi.fn(),
    registerDocumentFormattingEditProvider: vi.fn(),
    registerDocumentRangeFormattingEditProvider: vi.fn(),
    registerOnTypeFormattingEditProvider: vi.fn(),
  };
  return { Range, languages, editor: { defineTheme: vi.fn() } } as unknown as typeof monacoEditor & {
    languages: typeof languages;
    editor: { defineTheme: ReturnType<typeof vi.fn> };
  };
}

/** Text model over a string; enough of ITextModel for the providers. */
function model(text: string) {
  const lines = text.split('\n');
  return {
    getValue: () => text,
    getLineContent: (n: number) => lines[n - 1],
    getLineMaxColumn: (n: number) => lines[n - 1].length + 1,
    getFullModelRange: () => new Range(1, 1, lines.length, lines[lines.length - 1].length + 1),
    getWordUntilPosition: (p: { column: number }) => ({ word: '', startColumn: p.column, endColumn: p.column }),
    getWordAtPosition: (p: { lineNumber: number; column: number }) => {
      const line = lines[p.lineNumber - 1];
      const re = /[\p{L}\p{N}_]+/gu;
      for (let m = re.exec(line); m; m = re.exec(line)) {
        const start = m.index + 1;
        if (p.column >= start && p.column <= start + m[0].length) return { word: m[0], startColumn: start, endColumn: start + m[0].length };
      }
      return null;
    },
  } as unknown as monacoEditor.editor.ITextModel;
}

const spaces = { insertSpaces: true, tabSize: 2 } as monacoEditor.languages.FormattingOptions;
const tabs = { insertSpaces: false, tabSize: 4 } as monacoEditor.languages.FormattingOptions;
const token = {} as monacoEditor.CancellationToken;
const pos = (lineNumber: number, column: number) => ({ lineNumber, column }) as monacoEditor.Position;

describe('registerKingsejongLanguage', () => {
  it('registers the language and every provider', () => {
    const m = stubMonaco();
    registerKingsejongLanguage(m);
    expect(m.languages.register).toHaveBeenCalledWith(expect.objectContaining({ id: kingsejongLanguageId, extensions: ['.ksj'] }));
    for (const fn of [
      m.languages.setLanguageConfiguration,
      m.languages.setMonarchTokensProvider,
      m.languages.registerCompletionItemProvider,
      m.languages.registerHoverProvider,
      m.languages.registerDocumentFormattingEditProvider,
      m.languages.registerDocumentRangeFormattingEditProvider,
      m.languages.registerOnTypeFormattingEditProvider,
    ]) {
      expect(fn).toHaveBeenCalledWith(kingsejongLanguageId, expect.anything());
    }
    // Colours come from CodeEditor's themes; the language defines none of its own.
    expect(m.editor.defineTheme).not.toHaveBeenCalled();
  });
});

describe('completion', () => {
  it('offers snippets that replace the word being typed', () => {
    const provider = createKingsejongCompletionProvider(stubMonaco());
    const result = provider.provideCompletionItems(model('함'), pos(1, 2), {} as never, token) as monacoEditor.languages.CompletionList;
    const labels = result.suggestions.map((s) => s.label);
    expect(labels).toContain('함수');
    expect(labels).toContain('만약');
    expect(new Set(labels).size).toBe(labels.length);
    const fn = result.suggestions.find((s) => s.label === '함수')!;
    expect(fn.insertTextRules).toBe(4);
    expect(fn.insertText).toBe('${1:이름} = 함수(${2:매개변수}) {\n\t반환 $0\n}');
    // No C-style or English keywords from older versions of this file.
    for (const wrong of ['function', 'if', 'print', 'var', 'return']) expect(labels).not.toContain(wrong);
    expect(labels).toContain('출력');
    expect(fn.range).toEqual({ startLineNumber: 1, endLineNumber: 1, startColumn: 2, endColumn: 2 });
  });
});

describe('hover', () => {
  const provider = createKingsejongHoverProvider(stubMonaco());

  it('documents a keyword under the cursor', () => {
    const hover = provider.provideHover(model('  출력("안녕")'), pos(1, 4), token) as monacoEditor.languages.Hover;
    expect(hover.range).toEqual(new Range(1, 3, 1, 5));
    expect((hover.contents[0] as { value: string }).value).toContain('**출력** · `출력(값, ...)`');
  });

  it('follows the page language and looks past a trailing particle', () => {
    document.documentElement.lang = 'en';
    try {
      const hover = provider.provideHover(model('숫자들을 걸러낸다(f)'), pos(1, 7), token) as monacoEditor.languages.Hover;
      expect((hover.contents[0] as { value: string }).value).toContain('**Filter**');
      const range = provider.provideHover(model('i가 시작부터 끝까지 {'), pos(1, 6), token) as monacoEditor.languages.Hover;
      expect((range.contents[0] as { value: string }).value).toContain('**Range loop**');
      expect(range.range).toEqual(new Range(1, 6, 1, 8));
    } finally {
      document.documentElement.lang = '';
    }
  });

  it('returns nothing for unknown words and whitespace', () => {
    expect(provider.provideHover(model('바나나'), pos(1, 2), token)).toBeNull();
    expect(provider.provideHover(model('   '), pos(1, 2), token)).toBeNull();
  });
});

describe('document formatting', () => {
  const provider = createKingsejongFormattingProvider();
  const format = (text: string, options = spaces) => provider.provideDocumentFormattingEdits(model(text), options, token) as monacoEditor.languages.TextEdit[];

  it('re-indents nested blocks and keeps blank lines', () => {
    const [edit] = format('함수 시작() {\n만약 참 {\n출력(1)\n}\n\n}');
    expect(edit.text).toBe('함수 시작() {\n  만약 참 {\n    출력(1)\n  }\n\n}');
    expect(edit.range).toEqual(new Range(1, 1, 6, 2));
  });

  it('uses tabs when asked and never indents below zero', () => {
    expect(format('}\n{\nx\n}', tabs)[0].text).toBe('}\n{\n\tx\n}');
  });

  it('does not indent after a one-line block', () => {
    expect(format('만약 참 { 출력(1) }\nx')[0].text).toBe('만약 참 { 출력(1) }\nx');
  });
});

describe('range formatting', () => {
  const provider = createKingsejongRangeFormattingProvider(stubMonaco());

  it('indents the selection relative to the lines above it', () => {
    const text = '함수 시작() {\n만약 참 {\n출력(1)\n\n}\n}';
    const [edit] = provider.provideDocumentRangeFormattingEdits(model(text), new Range(3, 1, 5, 2) as never, spaces, token) as monacoEditor.languages.TextEdit[];
    expect(edit.text).toBe('    출력(1)\n\n  }');
    expect(edit.range).toEqual(new Range(3, 1, 5, 2));
  });

  it('handles a closing line before the selection and one-line blocks inside it', () => {
    const text = '{\n}\n{ x }\ny';
    const [edit] = provider.provideDocumentRangeFormattingEdits(model(text), new Range(3, 1, 4, 2) as never, tabs, token) as monacoEditor.languages.TextEdit[];
    expect(edit.text).toBe('{ x }\ny');
  });
});

describe('on-type formatting', () => {
  const provider = createKingsejongOnTypeFormattingProvider(stubMonaco());
  const type = (text: string, line: number, ch: string, options = spaces) =>
    provider.provideOnTypeFormattingEdits(model(text), pos(line, 1), ch, options, token) as monacoEditor.languages.TextEdit[];

  it('triggers on newline and closing brace', () => {
    expect(provider.autoFormatTriggerCharacters).toEqual(['\n', '}']);
  });

  it('indents one level after an opening brace and keeps the indent otherwise', () => {
    expect(type('  만약 참 {\n', 2, '\n')[0].text).toBe('    ');
    expect(type('  만약 참 {\n', 2, '\n', tabs)[0].text).toBe('  \t');
    expect(type('  출력(1)\n', 2, '\n')[0].text).toBe('  ');
    expect(type('first', 1, '\n')).toEqual([]);
  });

  it('dedents a closing brace by one level', () => {
    const [edit] = type('{\n    }', 2, '}');
    expect(edit).toEqual({ range: new Range(2, 1, 2, 5), text: '  ' });
    expect(type('{\n\t}', 2, '}', tabs)[0].text).toBe('');
    expect(type('}', 1, '}')).toEqual([]);
  });

  it('ignores other characters', () => {
    expect(type('x', 1, 'a')).toEqual([]);
  });
});
