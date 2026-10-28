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
    // Core keywords (Korean)
    '함수', 'function', 'func',
    '변수', 'var', 'let', 'const',
    '만약', 'if',
    '아니면', 'else',
    '동안', 'while',
    '반복', 'for',
    '순회', // for iteration
    '반환', 'return',
    '참', 'true',
    '거짓', 'false',
    '없음', 'null', 'nil',
    '출력', 'print',
    '입력', 'input',

    // Type-related
    '타입', 'type',
    '구조체', 'struct',
    '인터페이스', 'interface',
    '패키지', 'package',
    '가져오기', 'import',
    '내보내기', 'export',
    '클래스', 'class',

    // Control flow
    '계속', 'continue',
    '중단', 'break',
    '시도', 'try',
    '잡기', 'catch',
    '마침내', 'finally',
    '던지기', 'throw',

    // Object-oriented
    '새', 'new',
    '이것', 'this',
    '부모', 'super',

    // Logical operators (Korean)
    '그리고', 'and',
    '또는', 'or',
    '아님', 'not',

    // Special
    '시작', // entry point function name
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
      // Line comments in the starter programs and templates: "# ..."
      [/#.*$/, 'comment'],
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
        // Korean keywords with snippets
        {
          label: '함수',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '함수 ${1:이름}(${2:매개변수}) {\n\t${0:// 코드}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: '함수를 정의합니다',
          detail: '함수 정의',
          range,
        },
        {
          label: '만약',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '만약 ${1:조건} {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: '조건문을 실행합니다',
          detail: 'if 문',
          range,
        },
        {
          label: '만약-아니면',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '만약 ${1:조건} {\n\t${2:// 참일 때}\n} 아니면 {\n\t${0:// 거짓일 때}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: '조건에 따라 다른 코드를 실행합니다',
          detail: 'if-else 문',
          range,
        },
        {
          label: '반복',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '반복 ${1:변수} in ${2:범위} {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: '반복문을 실행합니다',
          detail: 'for 반복문',
          range,
        },
        {
          label: '동안',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '동안 ${1:조건} {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: '조건이 참인 동안 반복합니다',
          detail: 'while 반복문',
          range,
        },
        {
          label: '출력',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: '출력(${1:값})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: '값을 출력합니다',
          detail: '출력 함수',
          range,
        },
        {
          label: '변수',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '변수 ${1:이름} = ${2:값}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: '변수를 선언합니다',
          detail: '변수 선언',
          range,
        },
        {
          label: '반환',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: '반환 ${1:값}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: '함수에서 값을 반환합니다',
          detail: 'return',
          range,
        },

        // Special snippets
        {
          label: '시작함수',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '함수 시작() {\n\t${0:출력("안녕, 세상!")}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: '프로그램 진입점 함수를 생성합니다',
          detail: 'main 함수 템플릿',
          range,
        },
        {
          label: '헬로월드',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '함수 시작() {\n\t출력("안녕, 세상!")\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Hello World 프로그램을 생성합니다',
          detail: 'Hello World',
          range,
        },

        // English equivalents
        {
          label: 'function',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'function ${1:name}(${2:params}) {\n\t${0:// code}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Define a function',
          detail: 'function definition',
          range,
        },
        {
          label: 'if',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'if ${1:condition} {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'If statement',
          detail: 'if statement',
          range,
        },
        {
          label: 'ifelse',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'if ${1:condition} {\n\t${2:// true}\n} else {\n\t${0:// false}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'If-else statement',
          detail: 'if-else statement',
          range,
        },
        {
          label: 'for',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'for ${1:variable} in ${2:range} {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'For loop',
          detail: 'for loop',
          range,
        },
        {
          label: 'while',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'while ${1:condition} {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'While loop',
          detail: 'while loop',
          range,
        },
        {
          label: 'print',
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: 'print(${1:value})',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Print output',
          detail: 'print function',
          range,
        },
        {
          label: 'var',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'var ${1:name} = ${2:value}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Declare a variable',
          detail: 'variable declaration',
          range,
        },
        {
          label: 'return',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'return ${1:value}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Return value',
          detail: 'return statement',
          range,
        },

        // Logical operators
        {
          label: '그리고',
          kind: monaco.languages.CompletionItemKind.Operator,
          insertText: '그리고',
          documentation: '논리 AND 연산자',
          detail: 'and',
          range,
        },
        {
          label: '또는',
          kind: monaco.languages.CompletionItemKind.Operator,
          insertText: '또는',
          documentation: '논리 OR 연산자',
          detail: 'or',
          range,
        },
        {
          label: '아님',
          kind: monaco.languages.CompletionItemKind.Operator,
          insertText: '아님',
          documentation: '논리 NOT 연산자',
          detail: 'not',
          range,
        },

        // Advanced snippets - Class
        {
          label: '클래스',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: [
            '클래스 ${1:이름} {',
            '\t변수 ${2:속성}',
            '',
            '\t함수 생성자(${3:매개변수}) {',
            '\t\t이것.${2:속성} = ${3:매개변수}',
            '\t}',
            '',
            '\t함수 ${4:메서드}() {',
            '\t\t${0:// 코드}',
            '\t}',
            '}',
          ].join('\n'),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: '클래스를 정의합니다',
          detail: 'class template',
          range,
        },
        {
          label: 'class',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: [
            'class ${1:Name} {',
            '\tvar ${2:property}',
            '',
            '\tfunction constructor(${3:params}) {',
            '\t\tthis.${2:property} = ${3:params}',
            '\t}',
            '',
            '\tfunction ${4:method}() {',
            '\t\t${0:// code}',
            '\t}',
            '}',
          ].join('\n'),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Define a class',
          detail: 'class template',
          range,
        },

        // Advanced snippets - Module
        {
          label: '모듈',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: [
            '패키지 ${1:이름}',
            '',
            '가져오기 ${2:의존성}',
            '',
            '함수 ${3:공개함수}() {',
            '\t${0:// 공개 API}',
            '}',
            '',
            '내보내기 { ${3:공개함수} }',
          ].join('\n'),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: '모듈 구조를 생성합니다',
          detail: 'module template',
          range,
        },

        // Advanced snippets - Try-Catch
        {
          label: '시도-잡기',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: [
            '시도 {',
            '\t${1:// 시도할 코드}',
            '} 잡기 (${2:오류}) {',
            '\t${3:// 오류 처리}',
            '} 마침내 {',
            '\t${0:// 정리 코드}',
            '}',
          ].join('\n'),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: '예외 처리 블록을 생성합니다',
          detail: 'try-catch-finally',
          range,
        },
        {
          label: 'trycatch',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: [
            'try {',
            '\t${1:// code to try}',
            '} catch (${2:error}) {',
            '\t${3:// error handling}',
            '} finally {',
            '\t${0:// cleanup}',
            '}',
          ].join('\n'),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Try-catch-finally block',
          detail: 'try-catch-finally',
          range,
        },

        // Advanced snippets - Switch (if supported)
        {
          label: '선택',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: [
            '만약 ${1:값} == ${2:경우1} {',
            '\t${3:// 처리1}',
            '} 아니면 만약 ${1:값} == ${4:경우2} {',
            '\t${5:// 처리2}',
            '} 아니면 {',
            '\t${0:// 기본 처리}',
            '}',
          ].join('\n'),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: '다중 조건 분기를 생성합니다',
          detail: 'multiple conditions',
          range,
        },

        // Advanced snippets - Array iteration
        {
          label: '배열반복',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: [
            '변수 ${1:배열} = [${2:요소들}]',
            '반복 ${3:항목} in ${1:배열} {',
            '\t출력(${3:항목})',
            '\t${0}',
            '}',
          ].join('\n'),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: '배열을 순회합니다',
          detail: 'array iteration',
          range,
        },

        // Advanced snippets - Function with return
        {
          label: '반환함수',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: [
            '함수 ${1:이름}(${2:매개변수}) {',
            '\t${3:// 계산}',
            '\t반환 ${4:결과}',
            '}',
          ].join('\n'),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: '값을 반환하는 함수를 생성합니다',
          detail: 'function with return',
          range,
        },

        // Advanced snippets - Comment block
        {
          label: '주석블록',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: [
            '/*',
            ' * ${1:설명}',
            ' * ',
            ' * @param {${2:타입}} ${3:매개변수} - ${4:설명}',
            ' * @return {${5:타입}} ${6:반환값 설명}',
            ' */',
          ].join('\n'),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: '문서화 주석 블록을 생성합니다',
          detail: 'documentation comment',
          range,
        },
      ];

      return { suggestions };
    },
  };
}

/**
 * Hover provider for Kingsejong - provides documentation on hover
 */
export function createKingsejongHoverProvider(monaco: Monaco): monacoEditor.languages.HoverProvider {
  const keywordDocs: Record<string, string> = {
    '함수': '**함수 (function)**\n\n함수를 정의합니다.\n\n```kingsejong\n함수 이름(매개변수) {\n  // 코드\n}\n```',
    'function': '**function**\n\nDefines a function.\n\n```kingsejong\nfunction name(params) {\n  // code\n}\n```',
    '변수': '**변수 (variable)**\n\n변수를 선언합니다.\n\n```kingsejong\n변수 이름 = 값\n```',
    'var': '**var**\n\nDeclares a variable.\n\n```kingsejong\nvar name = value\n```',
    '만약': '**만약 (if)**\n\n조건문을 실행합니다.\n\n```kingsejong\n만약 조건 {\n  // 참일 때 실행\n}\n```',
    'if': '**if**\n\nExecutes a conditional statement.\n\n```kingsejong\nif condition {\n  // executes if true\n}\n```',
    '아니면': '**아니면 (else)**\n\n조건이 거짓일 때 실행합니다.\n\n```kingsejong\n만약 조건 {\n  // 참\n} 아니면 {\n  // 거짓\n}\n```',
    'else': '**else**\n\nExecutes when condition is false.\n\n```kingsejong\nif condition {\n  // true\n} else {\n  // false\n}\n```',
    '출력': '**출력 (print)**\n\n값을 출력합니다.\n\n```kingsejong\n출력("안녕, 세상!")\n```',
    'print': '**print**\n\nPrints a value.\n\n```kingsejong\nprint("Hello, World!")\n```',
    '반복': '**반복 (for)**\n\n반복문을 실행합니다.\n\n```kingsejong\n반복 변수 in 범위 {\n  // 반복 실행\n}\n```',
    'for': '**for**\n\nExecutes a loop.\n\n```kingsejong\nfor variable in range {\n  // loop body\n}\n```',
    '동안': '**동안 (while)**\n\n조건이 참인 동안 반복합니다.\n\n```kingsejong\n동안 조건 {\n  // 반복 실행\n}\n```',
    'while': '**while**\n\nRepeats while condition is true.\n\n```kingsejong\nwhile condition {\n  // loop body\n}\n```',
    '반환': '**반환 (return)**\n\n함수에서 값을 반환합니다.\n\n```kingsejong\n함수 더하기(a, b) {\n  반환 a + b\n}\n```',
    'return': '**return**\n\nReturns a value from a function.\n\n```kingsejong\nfunction add(a, b) {\n  return a + b\n}\n```',
    '그리고': '**그리고 (and)**\n\n논리 AND 연산자. 두 조건이 모두 참일 때 참.\n\n```kingsejong\n만약 a > 0 그리고 b > 0 {\n  // 둘 다 양수\n}\n```',
    'and': '**and**\n\nLogical AND operator. True when both conditions are true.\n\n```kingsejong\nif a > 0 and b > 0 {\n  // both positive\n}\n```',
    '또는': '**또는 (or)**\n\n논리 OR 연산자. 두 조건 중 하나라도 참이면 참.\n\n```kingsejong\n만약 a > 0 또는 b > 0 {\n  // 하나 이상 양수\n}\n```',
    'or': '**or**\n\nLogical OR operator. True when at least one condition is true.\n\n```kingsejong\nif a > 0 or b > 0 {\n  // at least one positive\n}\n```',
    '시작': '**시작**\n\n프로그램의 진입점 함수입니다.\n\n```kingsejong\n함수 시작() {\n  출력("안녕, 세상!")\n}\n```',
  };

  return {
    provideHover: (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const documentation = keywordDocs[word.word];
      if (!documentation) return null;

      return {
        range: new monaco.Range(
          position.lineNumber,
          word.startColumn,
          position.lineNumber,
          word.endColumn
        ),
        contents: [
          { value: documentation },
        ],
      };
    },
  };
}

/**
 * Theme colors for Kingsejong language
 */
export const kingsejongThemeColors = {
  keywords: '#569CD6',      // Blue for keywords
  types: '#4EC9B0',         // Cyan for types
  functions: '#DCDCAA',     // Yellow for functions
  variables: '#9CDCFE',     // Light blue for variables
  strings: '#CE9178',       // Orange for strings
  numbers: '#B5CEA8',       // Light green for numbers
  comments: '#6A9955',      // Green for comments
  operators: '#D4D4D4',     // Light gray for operators
  korean: '#C586C0',        // Purple for Korean keywords
};

/**
 * Register custom theme for Kingsejong
 */
export function registerKingsejongTheme(monaco: Monaco) {
  monaco.editor.defineTheme('kingsejong-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword.kingsejong', foreground: kingsejongThemeColors.keywords, fontStyle: 'bold' },
      { token: 'type.kingsejong', foreground: kingsejongThemeColors.types },
      { token: 'function.kingsejong', foreground: kingsejongThemeColors.functions },
      { token: 'variable.kingsejong', foreground: kingsejongThemeColors.variables },
      { token: 'string.kingsejong', foreground: kingsejongThemeColors.strings },
      { token: 'number.kingsejong', foreground: kingsejongThemeColors.numbers },
      { token: 'comment.kingsejong', foreground: kingsejongThemeColors.comments, fontStyle: 'italic' },
      { token: 'operator.kingsejong', foreground: kingsejongThemeColors.operators },
    ],
    colors: {
      'editor.foreground': '#D4D4D4',
      'editor.background': '#1E1E1E',
    },
  });
}

/**
 * Document formatting provider for Kingsejong
 * Formats code with proper indentation and spacing
 */
export function createKingsejongFormattingProvider(monaco: Monaco): monacoEditor.languages.DocumentFormattingEditProvider {
  return {
    provideDocumentFormattingEdits: (model, options) => {
      const edits: monacoEditor.languages.TextEdit[] = [];
      const text = model.getValue();
      const lines = text.split('\n');

      let indentLevel = 0;
      const indentString = options.insertSpaces
        ? ' '.repeat(options.tabSize)
        : '\t';

      const formattedLines: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines
        if (line === '') {
          formattedLines.push('');
          continue;
        }

        // Decrease indent for closing braces
        if (line.startsWith('}')) {
          indentLevel = Math.max(0, indentLevel - 1);
        }

        // Apply indentation
        const indentedLine = indentString.repeat(indentLevel) + line;
        formattedLines.push(indentedLine);

        // Increase indent for opening braces
        if (line.endsWith('{')) {
          indentLevel++;
        }

        // Decrease indent after closing brace if it's not at the start
        if (line.endsWith('}') && !line.startsWith('}')) {
          indentLevel = Math.max(0, indentLevel - 1);
        }
      }

      const formattedText = formattedLines.join('\n');

      // Create a single edit to replace all text
      const fullRange = model.getFullModelRange();
      edits.push({
        range: fullRange,
        text: formattedText,
      });

      return edits;
    },
  };
}

/**
 * Document range formatting provider for Kingsejong
 * Formats selected code range
 */
export function createKingsejongRangeFormattingProvider(monaco: Monaco): monacoEditor.languages.DocumentRangeFormattingEditProvider {
  return {
    provideDocumentRangeFormattingEdits: (model, range, options) => {
      const edits: monacoEditor.languages.TextEdit[] = [];

      // Get the selected text
      const startLine = range.startLineNumber;
      const endLine = range.endLineNumber;

      let indentLevel = 0;
      const indentString = options.insertSpaces
        ? ' '.repeat(options.tabSize)
        : '\t';

      // Calculate initial indent level by checking previous lines
      for (let i = 1; i < startLine; i++) {
        const line = model.getLineContent(i).trim();
        if (line.endsWith('{')) indentLevel++;
        if (line.startsWith('}')) indentLevel = Math.max(0, indentLevel - 1);
      }

      const formattedLines: string[] = [];

      for (let i = startLine; i <= endLine; i++) {
        const line = model.getLineContent(i).trim();

        // Skip empty lines
        if (line === '') {
          formattedLines.push('');
          continue;
        }

        // Decrease indent for closing braces
        if (line.startsWith('}')) {
          indentLevel = Math.max(0, indentLevel - 1);
        }

        // Apply indentation
        const indentedLine = indentString.repeat(indentLevel) + line;
        formattedLines.push(indentedLine);

        // Increase indent for opening braces
        if (line.endsWith('{')) {
          indentLevel++;
        }

        // Decrease indent after closing brace if it's not at the start
        if (line.endsWith('}') && !line.startsWith('}')) {
          indentLevel = Math.max(0, indentLevel - 1);
        }
      }

      const formattedText = formattedLines.join('\n');

      edits.push({
        range: new monaco.Range(startLine, 1, endLine, model.getLineMaxColumn(endLine)),
        text: formattedText,
      });

      return edits;
    },
  };
}

/**
 * On-type formatting provider for Kingsejong
 * Formats code as you type (e.g., auto-indent on newline)
 */
export function createKingsejongOnTypeFormattingProvider(monaco: Monaco): monacoEditor.languages.OnTypeFormattingEditProvider {
  return {
    autoFormatTriggerCharacters: ['\n', '}'],

    provideOnTypeFormattingEdits: (model, position, ch, options) => {
      const edits: monacoEditor.languages.TextEdit[] = [];

      if (ch === '\n') {
        // Auto-indent on newline
        const currentLine = position.lineNumber;
        const previousLine = currentLine - 1;

        if (previousLine > 0) {
          const previousLineText = model.getLineContent(previousLine).trim();
          const previousLineIndent = model.getLineContent(previousLine).match(/^\s*/)?.[0] || '';

          // If previous line ends with {, increase indent
          if (previousLineText.endsWith('{')) {
            const indentString = options.insertSpaces
              ? ' '.repeat(options.tabSize)
              : '\t';
            const newIndent = previousLineIndent + indentString;

            edits.push({
              range: new monaco.Range(currentLine, 1, currentLine, 1),
              text: newIndent,
            });
          } else {
            // Keep same indent
            edits.push({
              range: new monaco.Range(currentLine, 1, currentLine, 1),
              text: previousLineIndent,
            });
          }
        }
      } else if (ch === '}') {
        // Auto-dedent on closing brace
        const currentLine = position.lineNumber;
        const lineText = model.getLineContent(currentLine);
        const currentIndent = lineText.match(/^\s*/)?.[0] || '';

        if (currentIndent.length > 0) {
          const indentSize = options.insertSpaces ? options.tabSize : 1;
          const newIndentLength = Math.max(0, currentIndent.length - indentSize);
          const newIndent = currentIndent.substring(0, newIndentLength);

          edits.push({
            range: new monaco.Range(currentLine, 1, currentLine, currentIndent.length + 1),
            text: newIndent,
          });
        }
      }

      return edits;
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

  // Register hover provider
  monaco.languages.registerHoverProvider(
    kingsejongLanguageId,
    createKingsejongHoverProvider(monaco)
  );

  // Register document formatting provider
  monaco.languages.registerDocumentFormattingEditProvider(
    kingsejongLanguageId,
    createKingsejongFormattingProvider(monaco)
  );

  // Register document range formatting provider
  monaco.languages.registerDocumentRangeFormattingEditProvider(
    kingsejongLanguageId,
    createKingsejongRangeFormattingProvider(monaco)
  );

  // Register on-type formatting provider
  monaco.languages.registerOnTypeFormattingEditProvider(
    kingsejongLanguageId,
    createKingsejongOnTypeFormattingProvider(monaco)
  );

  // Register custom theme
  registerKingsejongTheme(monaco);
}
