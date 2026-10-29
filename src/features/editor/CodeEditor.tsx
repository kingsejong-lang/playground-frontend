'use client';

import { Editor, type BeforeMount, type OnMount, loader } from '@monaco-editor/react';
import { useEffect, useRef, useState } from 'react';
import type { editor as MonacoEditor } from 'monaco-editor';
import type { DiagnosticView } from '@/lib/rpc';
import { registerKingsejongLanguage, kingsejongLanguageId } from '@/features/editor/monaco/kingsejong-language';

/** monaco-editor version copied to public/monaco by scripts/copy-monaco.mjs (pinned in package.json). */
export const MONACO_VERSION = '0.55.1';
/** Same-origin path of Monaco's AMD bundle; nothing is loaded from a CDN. */
export const MONACO_VS_PATH = `/monaco/${MONACO_VERSION}/vs`;

if (typeof window !== 'undefined') {
  loader.config({
    paths: { vs: MONACO_VS_PATH },
    'vs/nls': {
      availableLanguages: {
        '*': 'en',
      },
    },
  });
}

export type EditorThemeName = 'code-sanctuary-dark' | 'code-sanctuary-light' | 'hc-black' | 'hc-light';

/**
 * A playground command offered in the editor's command palette (F1) and, when
 * `key` is set, bound to the matching global shortcut inside the editor (Monaco
 * consumes the key there, so the window-level shortcut does not fire twice).
 */
export interface EditorCommand {
  id: string;
  label: string;
  run: () => void;
  key?: 'run' | 'stop' | 'save';
  /** Also shown in the editor's right-click menu. */
  contextMenu?: boolean;
}

/** A request to move the cursor; `nonce` makes repeated jumps to the same place work. */
export interface RevealRequest {
  line: number;
  column: number;
  nonce: number;
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  readOnly?: boolean;
  fontSize?: number;
  fontFamily?: string;
  tabSize?: number;
  minimap?: boolean;
  theme?: EditorThemeName;
  /** Playground commands for the command palette (F1); see EditorCommand. */
  commands?: readonly EditorCommand[];
  /** Accessible name of the editor textarea. */
  ariaLabel?: string;
  /** Diagnostics for this file, drawn as squiggles. */
  diagnostics?: readonly DiagnosticView[];
  reveal?: RevealRequest | null;
}

/*
  Code Sanctuary editor themes. Token colours mirror the CSS tokens in
  globals.css and keep 4.5:1 against the editor background in both themes.
*/
const SANCTUARY_DARK: MonacoEditor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'keyword', foreground: '8f9cf7', fontStyle: 'bold' },
    { token: 'type', foreground: '8f9cf7' },
    { token: 'string', foreground: '4fd1a1' },
    { token: 'number', foreground: 'e9b949' },
    { token: 'comment', foreground: '8e92b3', fontStyle: 'italic' },
    { token: 'identifier', foreground: 'e4e4e7' },
    { token: 'function', foreground: 'e4e4e7' },
    { token: 'operator', foreground: 'b4b7cf' },
    { token: 'string.invalid', foreground: 'ff6b6b' },
  ],
  colors: {
    'editor.background': '#12121a',
    'editor.foreground': '#e4e4e7',
    'editor.lineHighlightBackground': '#1a1a24',
    'editorLineNumber.foreground': '#8e92b3',
    'editorLineNumber.activeForeground': '#e4e4e7',
    'editor.selectionBackground': '#3a3f6b',
    'editor.inactiveSelectionBackground': '#272a45',
    'editorCursor.foreground': '#8f9cf7',
    'editorWhitespace.foreground': '#2a2a35',
    'editorIndentGuide.background1': '#2a2a35',
    'editorIndentGuide.activeBackground1': '#62667f',
    'editorWidget.background': '#1c1c27',
    'editorWidget.border': '#2a2a35',
    'editorSuggestWidget.background': '#1c1c27',
    'editorSuggestWidget.border': '#2a2a35',
    'editorSuggestWidget.selectedBackground': '#2b2e4d',
    'editorError.foreground': '#ff6b6b',
    'editorWarning.foreground': '#e9b949',
    'editorInfo.foreground': '#8f9cf7',
    'focusBorder': '#8f9cf7',
    'scrollbarSlider.background': '#62667f66',
    'scrollbarSlider.hoverBackground': '#62667f99',
  },
};

const SANCTUARY_LIGHT: MonacoEditor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'keyword', foreground: '3b4ac0', fontStyle: 'bold' },
    { token: 'type', foreground: '3b4ac0' },
    { token: 'string', foreground: '1a7a57' },
    { token: 'number', foreground: 'a15c00' },
    { token: 'comment', foreground: '5d6070', fontStyle: 'italic' },
    { token: 'identifier', foreground: '15161c' },
    { token: 'function', foreground: '15161c' },
    { token: 'operator', foreground: '3f4253' },
    { token: 'string.invalid', foreground: 'c22b2b' },
  ],
  colors: {
    'editor.background': '#fbfbfc',
    'editor.foreground': '#15161c',
    'editor.lineHighlightBackground': '#f0f1f5',
    'editorLineNumber.foreground': '#5d6070',
    'editorLineNumber.activeForeground': '#15161c',
    'editor.selectionBackground': '#cdd3f5',
    'editor.inactiveSelectionBackground': '#e3e6f5',
    'editorCursor.foreground': '#3b4ac0',
    'editorWhitespace.foreground': '#d6d9e0',
    'editorIndentGuide.background1': '#d6d9e0',
    'editorIndentGuide.activeBackground1': '#868b9f',
    'editorWidget.background': '#ffffff',
    'editorWidget.border': '#d6d9e0',
    'editorSuggestWidget.background': '#ffffff',
    'editorSuggestWidget.border': '#d6d9e0',
    'editorSuggestWidget.selectedBackground': '#e6e8ee',
    'editorError.foreground': '#c22b2b',
    'editorWarning.foreground': '#8a5a00',
    'editorInfo.foreground': '#3b4ac0',
    'focusBorder': '#3b4ac0',
  },
};

function monacoLanguage(lang: string): string {
  if (lang.startsWith('python')) return 'python';
  if (lang.startsWith('go')) return 'go';
  if (lang.startsWith('kingsejong')) return kingsejongLanguageId;
  return 'plaintext';
}

export default function CodeEditor({
  value,
  onChange,
  language,
  readOnly = false,
  fontSize = 14,
  fontFamily = 'Monaco, Menlo, monospace',
  tabSize = 2,
  minimap = true,
  theme = 'code-sanctuary-dark',
  commands,
  ariaLabel,
  diagnostics,
  reveal,
}: CodeEditorProps) {
  const isKingsejongRegistered = useRef(false);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
  const [ready, setReady] = useState(false);
  const commandsRef = useRef(commands);
  useEffect(() => {
    commandsRef.current = commands;
  }, [commands]);
  // Re-register only when the set of commands or their labels change (e.g. locale).
  const commandSignature = (commands ?? []).map((c) => `${c.id}:${c.label}:${c.key ?? ''}`).join('|');

  // Themes must exist before the editor is created; defining them in onMount
  // left the first render on Monaco's default light theme.
  const handleBeforeMount: BeforeMount = (monaco) => {
    monaco.editor.defineTheme('code-sanctuary-dark', SANCTUARY_DARK);
    monaco.editor.defineTheme('code-sanctuary-light', SANCTUARY_LIGHT);

    if (!isKingsejongRegistered.current) {
      try {
        registerKingsejongLanguage(monaco);
        isKingsejongRegistered.current = true;
      } catch (error) {
        console.error('Failed to register Kingsejong language:', error);
      }
    }
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setReady(true);
  };

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!ready || !editor || !monaco) return;
    const keys = {
      run: monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      stop: monaco.KeyMod.CtrlCmd | monaco.KeyCode.Period,
      save: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
    };
    const disposables = (commandsRef.current ?? []).map((c, order) =>
      editor.addAction({
        id: `playground.${c.id}`,
        label: c.label,
        keybindings: c.key ? [keys[c.key]] : undefined,
        contextMenuGroupId: c.contextMenu ? 'playground' : undefined,
        contextMenuOrder: order,
        run: () => commandsRef.current?.find((x) => x.id === c.id)?.run(),
      })
    );
    return () => disposables.forEach((d) => d.dispose());
    // commandSignature captures every change that needs re-registration.
  }, [ready, commandSignature]);

  // Diagnostics become editor markers (squiggles + hover message).
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (!monaco || !model) return;
    const severity = { error: monaco.MarkerSeverity.Error, warning: monaco.MarkerSeverity.Warning, info: monaco.MarkerSeverity.Info };
    const markers = (diagnostics ?? [])
      .filter((d) => d.line > 0)
      .map((d) => {
        const line = Math.min(d.line, model.getLineCount());
        const startColumn = Math.max(1, d.column || 1);
        return {
          severity: severity[d.severity],
          message: d.message,
          code: d.code || undefined,
          startLineNumber: line,
          startColumn,
          endLineNumber: line,
          endColumn: Math.max(startColumn + 1, model.getLineMaxColumn(line)),
        };
      });
    monaco.editor.setModelMarkers(model, 'playground-run', markers);
  }, [diagnostics, value]);

  // Jump to a diagnostic position.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !reveal) return;
    const position = { lineNumber: reveal.line, column: Math.max(1, reveal.column || 1) };
    editor.revealPositionInCenter(position);
    editor.setPosition(position);
    editor.focus();
  }, [reveal]);

  return (
    <Editor
      height="100%"
      language={monacoLanguage(language)}
      value={value}
      onChange={(next) => onChange(next || '')}
      theme={theme}
      beforeMount={handleBeforeMount}
      onMount={handleEditorDidMount}
      loading={<EditorSkeleton />}
      options={{
        readOnly,
        minimap: { enabled: minimap },
        fontSize,
        fontFamily,
        tabSize,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        suggestOnTriggerCharacters: true,
        quickSuggestions: true,
        wordBasedSuggestions: 'off',
        ariaLabel,
        padding: { top: 12, bottom: 12 },
        renderLineHighlightOnlyWhenFocus: true,
        fixedOverflowWidgets: true,
      }}
    />
  );
}

/** Placeholder lines shown while Monaco loads. */
export function EditorSkeleton({ label }: { label?: string }) {
  const widths = ['62%', '48%', '71%', '0%', '39%', '55%', '30%'];
  return (
    <div className="h-full w-full bg-surface px-5 py-4" role="status" aria-busy="true">
      {label && <span className="sr-only">{label}</span>}
      <div className="space-y-3" aria-hidden="true">
        {widths.map((w, i) => (
          <div key={i} className="flex items-center gap-4">
            <span className="w-4 text-right font-mono text-xs text-fg-muted">{i + 1}</span>
            <span className="h-3 rounded-sm bg-hover" style={{ width: w }} />
          </div>
        ))}
      </div>
    </div>
  );
}
