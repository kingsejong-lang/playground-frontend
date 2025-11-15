/**
 * Kingsejong language definition for Monaco Editor
 * Provides syntax highlighting, autocomplete, and language features
 *
 * Note: This file should be imported dynamically (client-side only)
 * to avoid SSR issues with Monaco Editor.
 */

import type * as monacoEditor from 'monaco-editor';

export const kingsejongLanguageId = 'kingsejong';

type Monaco = typeof monacoEditor;

/**
 * Kingsejong language configuration
 */
export const kingsejongLanguageConfig: monacoEditor.languages.LanguageConfiguration = {
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/'],
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  folding: {
    markers: {
      start: new RegExp('^\\s*//\\s*#region\\b'),
      end: new RegExp('^\\s*//\\s*#endregion\\b'),
    },
  },
};

/**
 * Kingsejong language tokens and syntax highlighting
 */
export const kingsejongLanguageTokensProvider: monacoEditor.languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.ks',

  keywords: [
    '함수', 'function', 'func',
    '변수', 'var', 'let', 'const',
    '만약', 'if',
    '아니면', 'else',
    '동안', 'while',
    '반복', 'for',
    '반환', 'return',
    '참', 'true',
    '거짓', 'false',
    '없음', 'null', 'nil',
    '출력', 'print',
    '입력', 'input',
    '타입', 'type',
    '구조체', 'struct',
    '인터페이스', 'interface',
    '패키지', 'package',
    '가져오기', 'import',
    '내보내기', 'export',
    '클래스', 'class',
    '계속', 'continue',
    '중단', 'break',
    '시도', 'try',
    '잡기', 'catch',
    '마침내', 'finally',
    '던지기', 'throw',
    '새', 'new',
    '이것', 'this',
    '부모', 'super',
  ],

  typeKeywords: [
    '정수', 'int', 'integer',
    '실수', 'float', 'double',
    '문자열', 'string', 'str',
    '불린', 'boolean', 'bool',
    '배열', 'array', 'list',
    '맵', 'map', 'dict', 'dictionary',
    '세트', 'set',
    '객체', 'object',
  ],

  operators: [
    '=', '>', '<', '!', '~', '?', ':',
    '==', '<=', '>=', '!=',
    '&&', '||', '++', '--',
    '+', '-', '*', '/', '&', '|', '^', '%',
    '<<', '>>', '>>>', '+=', '-=', '*=', '/=',
    '&=', '|=', '^=', '%=', '<<=', '>>=', '>>>=',
  ],

  symbols: /[=><!~?:&|+\-*\/\^%]+/,
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
  digits: /\d+(_+\d+)*/,
  octaldigits: /[0-7]+(_+[0-7]+)*/,
  binarydigits: /[0-1]+(_+[0-1]+)*/,
  hexdigits: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,

  tokenizer: {
    root: [
      // Identifiers and keywords
      [/[a-zA-Z_가-힣]\w*/, {
        cases: {
          '@keywords': 'keyword',
          '@typeKeywords': 'type',
          '@default': 'identifier',
        },
      }],

      // Whitespace
      { include: '@whitespace' },

      // Delimiters and operators
      [/[{}()\[\]]/, '@brackets'],
      [/[<>](?!@symbols)/, '@brackets'],
      [/@symbols/, {
        cases: {
          '@operators': 'operator',
          '@default': '',
        },
      }],

      // Numbers
      [/(@digits)[eE]([\-+]?(@digits))?/, 'number.float'],
      [/(@digits)\.(@digits)([eE][\-+]?(@digits))?/, 'number.float'],
      [/0[xX](@hexdigits)/, 'number.hex'],
      [/0[oO]?(@octaldigits)/, 'number.octal'],
      [/0[bB](@binarydigits)/, 'number.binary'],
      [/@digits/, 'number'],

      // Delimiter: after number because of .\d floats
      [/[;,.]/, 'delimiter'],

      // Strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'],  // non-terminated string
      [/'([^'\\]|\\.)*$/, 'string.invalid'],  // non-terminated string
      [/"/, 'string', '@string_double'],
      [/'/, 'string', '@string_single'],
    ],

    whitespace: [
      [/[ \t\r\n]+/, ''],
      [/\/\*/, 'comment', '@comment'],
      [/\/\/.*$/, 'comment'],
    ],

    comment: [
      [/[^\/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[\/*]/, 'comment'],
    ],

    string_double: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, 'string', '@pop'],
    ],

    string_single: [
      [/[^\\']+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/'/, 'string', '@pop'],
    ],
  },
};

/**
 * Autocomplete provider for Kingsejong
 */
export function createKingsejongCompletionProvider(monaco: Monaco): monacoEditor.languages.CompletionItemProvider {
  return {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: monacoEditor.languages.CompletionItem[] = [
        // Keywords
        {
          label: '함수',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: '함수 ${1:이름}(${2:매개변수}) {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Define a function',
          range,
        },
        {
          label: '만약',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: '만약 ${1:조건} {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'If statement',
          range,
        },
        {
          label: '반복',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: '반복 ${1:변수} in ${2:범위} {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'For loop',
          range,
        },
        {
          label: '동안',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: '동안 ${1:조건} {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'While loop',
          range,
        },
        {
          label: '출력',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: '출력(${1:값})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Print output',
          range,
        },
        {
          label: '변수',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: '변수 ${1:이름} = ${2:값}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Declare a variable',
          range,
        },
        {
          label: '반환',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: '반환 ${1:값}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Return value',
          range,
        },
        // English equivalents
        {
          label: 'function',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'function ${1:name}(${2:params}) {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Define a function',
          range,
        },
        {
          label: 'if',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'if ${1:condition} {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'If statement',
          range,
        },
        {
          label: 'for',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'for ${1:variable} in ${2:range} {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'For loop',
          range,
        },
        {
          label: 'while',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'while ${1:condition} {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'While loop',
          range,
        },
        {
          label: 'print',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'print(${1:value})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Print output',
          range,
        },
      ];

      return { suggestions };
    },
  };
}

/**
 * Register Kingsejong language with Monaco
 */
export function registerKingsejongLanguage(monaco: Monaco) {
  // Register language
  monaco.languages.register({ id: kingsejongLanguageId });

  // Set language configuration
  monaco.languages.setLanguageConfiguration(kingsejongLanguageId, kingsejongLanguageConfig);

  // Set tokens provider
  monaco.languages.setMonarchTokensProvider(kingsejongLanguageId, kingsejongLanguageTokensProvider);

  // Register completion provider
  monaco.languages.registerCompletionItemProvider(
    kingsejongLanguageId,
    createKingsejongCompletionProvider(monaco)
  );
}
