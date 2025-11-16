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
  theme?: string;
  onFormat?: () => void;
}

export default function CodeEditor({
  value,
  onChange,
  language,
  readOnly = false,
  fontSize = 14,
  fontFamily = 'Fira Code, Monaco, monospace',
  tabSize = 2,
  minimap = true,
  theme = 'vs-dark',
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
