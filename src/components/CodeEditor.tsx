'use client';

import { Editor } from '@monaco-editor/react';

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
}: CodeEditorProps) {
  const getMonacoLanguage = (lang: string): string => {
    if (lang.startsWith('python')) return 'python';
    if (lang.startsWith('go')) return 'go';
    if (lang.startsWith('kingsejong')) return 'plaintext'; // Monaco doesn't support Kingsejong yet
    return 'plaintext';
  };

  return (
    <Editor
      height="100%"
      language={getMonacoLanguage(language)}
      value={value}
      onChange={(value) => onChange(value || '')}
      theme={theme}
      options={{
        readOnly,
        minimap: { enabled: minimap },
        fontSize,
        fontFamily,
        tabSize,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
      }}
    />
  );
}
