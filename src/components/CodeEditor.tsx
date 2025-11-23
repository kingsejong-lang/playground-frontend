'use client';

import { Editor, OnMount, loader } from '@monaco-editor/react';
import { useRef, useEffect } from 'react';
import { registerKingsejongLanguage, kingsejongLanguageId } from '@/lib/monaco/kingsejong-language';

// Configure Monaco loader to avoid React DevTools conflicts
if (typeof window !== 'undefined') {
  loader.config({
    'vs/nls': {
      availableLanguages: {
        '*': 'en',
      },
    },
  });
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
  theme?: 'code-sanctuary-dark' | 'code-sanctuary-light' | string;
  onFormat?: () => void;
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
  onFormat,
}: CodeEditorProps) {
  const isKingsejongRegistered = useRef(false);

  const getMonacoLanguage = (lang: string): string => {
    if (lang.startsWith('python')) return 'python';
    if (lang.startsWith('go')) return 'go';
    if (lang.startsWith('kingsejong')) return kingsejongLanguageId;
    return 'plaintext';
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    // Register Code Sanctuary Dark theme
    monaco.editor.defineTheme('code-sanctuary-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '4c5fd5', fontStyle: 'bold' },
        { token: 'string', foreground: '3fb68b' },
        { token: 'number', foreground: '3fb68b' },
        { token: 'comment', foreground: '6e7191', fontStyle: 'italic' },
        { token: 'identifier', foreground: 'e4e4e7' },
        { token: 'type', foreground: '4c5fd5' },
        { token: 'function', foreground: 'e4e4e7' },
      ],
      colors: {
        'editor.background': '#12121a',
        'editor.foreground': '#e4e4e7',
        'editor.lineHighlightBackground': '#16161f',
        'editorLineNumber.foreground': '#6e7191',
        'editorLineNumber.activeForeground': '#e4e4e7',
        'editor.selectionBackground': '#2a2a35',
        'editor.inactiveSelectionBackground': '#1a1a22',
        'editorCursor.foreground': '#4c5fd5',
        'editorWhitespace.foreground': '#2a2a35',
        'editorIndentGuide.background': '#2a2a35',
        'editorIndentGuide.activeBackground': '#4c5fd5',
        'editorWidget.background': '#0a0a0e',
        'editorWidget.border': '#2a2a35',
        'editorSuggestWidget.background': '#0a0a0e',
        'editorSuggestWidget.border': '#2a2a35',
        'editorSuggestWidget.selectedBackground': '#2a2a35',
      },
    });

    // Register Code Sanctuary Light theme
    monaco.editor.defineTheme('code-sanctuary-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '4c5fd5', fontStyle: 'bold' },
        { token: 'string', foreground: '3fb68b' },
        { token: 'number', foreground: '3fb68b' },
        { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
        { token: 'identifier', foreground: '111827' },
        { token: 'type', foreground: '4c5fd5' },
        { token: 'function', foreground: '111827' },
      ],
      colors: {
        'editor.background': '#f9fafb',
        'editor.foreground': '#111827',
        'editor.lineHighlightBackground': '#f3f4f6',
        'editorLineNumber.foreground': '#6b7280',
        'editorLineNumber.activeForeground': '#111827',
        'editor.selectionBackground': '#d1d5db',
        'editor.inactiveSelectionBackground': '#e5e7eb',
        'editorCursor.foreground': '#4c5fd5',
        'editorWhitespace.foreground': '#d1d5db',
        'editorIndentGuide.background': '#d1d5db',
        'editorIndentGuide.activeBackground': '#4c5fd5',
        'editorWidget.background': '#ffffff',
        'editorWidget.border': '#d1d5db',
        'editorSuggestWidget.background': '#ffffff',
        'editorSuggestWidget.border': '#d1d5db',
        'editorSuggestWidget.selectedBackground': '#f3f4f6',
      },
    });

    // Register Kingsejong language once
    if (!isKingsejongRegistered.current) {
      try {
        registerKingsejongLanguage(monaco);
        isKingsejongRegistered.current = true;
      } catch (error) {
        console.error('Failed to register Kingsejong language:', error);
      }
    }

    // Register format code keyboard shortcut (Ctrl+Shift+F / Cmd+Shift+F)
    if (onFormat) {
      editor.addAction({
        id: 'format-code',
        label: 'Format Code',
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
        ],
        run: () => {
          onFormat();
        },
      });
    }
  };

  return (
    <Editor
      height="100%"
      language={getMonacoLanguage(language)}
      value={value}
      onChange={(value) => onChange(value || '')}
      theme={theme}
      onMount={handleEditorDidMount}
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
      }}
    />
  );
}
