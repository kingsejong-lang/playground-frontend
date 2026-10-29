/**
 * KingSejong language support for Monaco: tokens, brackets, indentation,
 * completion, hover and formatting.
 *
 * The token rules follow the language's own lexer (kingsejong-lang v0.6,
 * src/lexer/Token.cpp and Lexer.cpp), not a generic C-like grammar:
 * - Comments: `#` to end of line (the documented form), and `//` and
 *   `/* *\/`, which the lexer also accepts.
 * - Strings: "..." or '...', with escapes \n \t \r \\ \" \' (any other
 *   escaped character stands for itself). There are no raw or template strings.
 * - Numbers: decimal integers and decimals with digits on both sides of the
 *   point (`3.14`). No exponent, hex or digit separators.
 * - Identifiers: ASCII letters, `_` and every character of three-byte UTF-8,
 *   which includes Hangul, then also digits.
 * - Keywords: the table in Token.cpp. Particles (조사) are tokens too. The
 *   lexer splits a particle off the end of a word only when another word, a
 *   number or a string follows. Range markers (부터, 까지, 미만, ...) are
 *   always split off.
 *
 * Load on the client only (Monaco does not run on the server).
 */

import type * as monacoEditor from 'monaco-editor';
import { REFERENCE } from '@/features/reference/entries';

export const kingsejongLanguageId = 'kingsejong';

type Monaco = typeof monacoEditor;

/** Statement and declaration keywords (Token.cpp), without particles and range markers. */
export const KEYWORDS = [
  '만약', '아니면', '반복', '반복한다', '동안', '각각',
  '함수', '반환', '가져오기',
  '그리고', '또는', '하고', '하라', 'when',
  '시도', '오류', '마지막', '던지다',
  '클래스', '생성자', '공개', '비공개', '자신', '상속', '상위',
  '비동기', '대기',
];

/** Type keywords (Token.cpp). 정수, 실수 and 문자열 also work as conversion functions. */
export const TYPE_KEYWORDS = ['정수', '실수', '문자', '문자열', '논리', '배열'];

/** 참 and 거짓 are keywords; 없음 is the null value (the evaluator resolves it unless shadowed). */
export const CONSTANTS = ['참', '거짓', '없음'];

/** Particle tokens (Token.cpp). Longer forms first so 으로/에서 win over 로/에. */
export const PARTICLES = ['으로', '에서', '을', '를', '이', '가', '은', '는', '의', '로', '에'];

/** Range and count markers, always split off the preceding word by the lexer. */
export const RANGE_MARKERS = ['부터', '까지', '미만', '초과', '이하', '이상', '씩', '번'];

/**
 * Built-in functions registered by the evaluator (src/evaluator/Builtin.cpp) and
 * the particle-based array methods. Highlighted, but plain identifiers to the lexer.
 */
export const BUILTINS = [
  '출력', '입력', '타입', '길이', '부분문자열', '포함', '추가',
  '딕셔너리_키들', '딕셔너리_값들', '딕셔너리_포함', '분리', '찾기', '바꾸기', '대문자', '소문자',
  '반올림', '올림', '내림', '절대값', '제곱근', '제곱',
  'JSON_파싱', 'JSON_문자열화', '현재_시간', '현재_날짜', '현재_시각', '현재_날짜시간', '시간_포맷', '타임스탬프', '슬립',
  '정규표현식_일치', '정규표현식_검색', '정규표현식_모두_찾기', '정규표현식_치환', '정규표현식_분리', '정규표현식_추출', '정규표현식_개수',
  '이메일_검증', 'URL_검증', '전화번호_검증', 'Base64_인코딩', 'Base64_디코딩', 'URL_인코딩',
  '문자열_해시', '해시_비교', '체크섬', 'XOR_암호화', 'XOR_복호화', '시저_암호화', '시저_복호화', '랜덤_문자열', '랜덤_숫자',
  'assert', 'assert_같음', 'assert_다름', 'assert_참', 'assert_거짓',
  // Array methods used with particles: 숫자들을 걸러낸다(...)
  '걸러낸다', '변환한다', '바꾼다', '축약한다', '찾다', '정렬한다', '역순으로_나열한다',
];

const ID_START = 'A-Za-z_\\u0800-\\uffff';
const ID_PART = 'A-Za-z0-9_\\u0800-\\uffff';
const alternatives = (words: readonly string[]) => words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
/** A whole word that is a keyword of any kind (the lexer never splits those). */
const KEYWORD_WORD = `(?:${alternatives([...KEYWORDS, ...TYPE_KEYWORDS, ...RANGE_MARKERS, '참', '거짓'])})(?![${ID_PART}])`;

/**
 * Language configuration: comment toggling, brackets, auto-closing, indentation.
 */
export const kingsejongLanguageConfig: monacoEditor.languages.LanguageConfiguration = {
  comments: {
    lineComment: '#',
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
    { open: '"', close: '"', notIn: ['string', 'comment'] },
    { open: "'", close: "'", notIn: ['string', 'comment'] },
    { open: '/*', close: ' */', notIn: ['string'] },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  // Words for double-click selection and word-based features include Hangul.
  wordPattern: new RegExp(`-?\\d+(?:\\.\\d+)?|[${ID_START}][${ID_PART}]*`),
  indentationRules: {
    // A line that opens a block, array or call without closing it (ignoring a trailing comment).
    increaseIndentPattern: /^.*(?:\{|\[|\()\s*(?:#.*)?$/,
    // A line that starts by closing one.
    decreaseIndentPattern: /^\s*[}\])]/,
  },
  folding: {
    markers: {
      start: /^\s*#\s*region\b/,
      end: /^\s*#\s*endregion\b/,
    },
  },
};

/**
 * Monarch tokenizer. Token names map onto the editor themes' rules
 * (keyword, type, string, number, comment, operator, ...).
 */
export const kingsejongLanguageTokensProvider: monacoEditor.languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.ksj',
  unicode: true,

  keywords: KEYWORDS,
  typeKeywords: TYPE_KEYWORDS,
  constants: CONSTANTS,
  particles: PARTICLES,
  rangeMarkers: RANGE_MARKERS,
  builtins: BUILTINS,

  escapes: /\\./,

  tokenizer: {
    root: [
      // Comments
      [/#.*$/, 'comment'],
      [/\/\/.*$/, 'comment'],
      [/\/\*/, 'comment', '@blockComment'],

      // Strings: the lexer reads up to the matching quote, across line breaks.
      [/"/, 'string.quote', '@stringDouble'],
      [/'/, 'string.quote', '@stringSingle'],

      // Numbers, followed directly by a range marker in "1부터 10까지", "3번".
      [/\d+\.\d+/, 'number.float'],
      [/\d+/, 'number'],

      // A word ending in a range marker: "시작부터", "끝까지", "횟수번".
      [
        new RegExp(`([${ID_START}][${ID_PART}]*?)(${alternatives(RANGE_MARKERS)})(?![${ID_PART}])`),
        [
          { cases: { '@keywords': 'keyword', '@typeKeywords': 'type', '@constants': 'constant', '@builtins': 'predefined', '@default': 'identifier' } },
          'keyword.range',
        ],
      ],

      // A word ending in a particle, split off when a word (not a keyword), a number
      // or a string follows on the same line: "숫자들을 정렬한다", "i가 1부터".
      [
        new RegExp(
          `([${ID_START}][${ID_PART}]*?)(${alternatives(PARTICLES)})(?=[ \\t]+(?:\\d|"|'|-\\d|(?!${KEYWORD_WORD})[${ID_START}]))`
        ),
        [
          { cases: { '@keywords': 'keyword', '@typeKeywords': 'type', '@constants': 'constant', '@builtins': 'predefined', '@default': 'identifier' } },
          'keyword.josa',
        ],
      ],

      // Whole words
      [
        new RegExp(`[${ID_START}][${ID_PART}]*`),
        {
          cases: {
            '@keywords': 'keyword',
            '@rangeMarkers': 'keyword.range',
            '@particles': 'keyword.josa',
            '@typeKeywords': 'type',
            '@constants': 'constant',
            '@builtins': 'predefined',
            '@default': 'identifier',
          },
        },
      ],

      // Brackets, operators and delimiters
      [/[{}()[\]]/, '@brackets'],
      [/->|==|!=|<=|>=|&&|\|\||[=+\-*/%<>!]/, 'operator'],
      [/[;,.:]/, 'delimiter'],
      [/[ \t\r\n]+/, ''],
    ],

    blockComment: [
      [/[^*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/\*/, 'comment'],
    ],

    stringDouble: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/"/, 'string.quote', '@pop'],
    ],

    stringSingle: [
      [/[^\\']+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/'/, 'string.quote', '@pop'],
    ],
  },
};

interface Snippet {
  label: string;
  insertText: string;
  detail: string;
  documentation: string;
}

/** Snippets in the language's real syntax (see the reference panel for the same forms). */
export const SNIPPETS: readonly Snippet[] = [
  { label: '만약', insertText: '만약 (${1:조건}) {\n\t$0\n}', detail: '조건문', documentation: '조건이 참일 때만 실행해요.' },
  { label: '만약-아니면', insertText: '만약 (${1:조건}) {\n\t$2\n} 아니면 {\n\t$0\n}', detail: '조건문 (아니면)', documentation: '조건이 거짓일 때 실행할 블록도 함께 써요.' },
  { label: '반복', insertText: '반복 (${1:조건}) {\n\t$0\n}', detail: '조건 반복', documentation: '조건이 참인 동안 되풀이해요. 동안 (조건) 도 같은 뜻이에요.' },
  { label: '번 반복한다', insertText: '${1:3}번 반복한다 {\n\t$0\n}', detail: 'N번 반복', documentation: '정해진 횟수만큼 되풀이해요.' },
  { label: '부터-까지', insertText: '${1:i}가 ${2:1}부터 ${3:10}까지 {\n\t$0\n}', detail: '범위 반복', documentation: '까지·이하는 끝을 포함하고, 미만은 빼요.' },
  { label: '함수', insertText: '${1:이름} = 함수(${2:매개변수}) {\n\t반환 $0\n}', detail: '함수 정의', documentation: '함수는 값이라 변수에 담아요.' },
  { label: '비동기 함수', insertText: '${1:이름} = 비동기 함수(${2:매개변수}) {\n\t반환 $0\n}', detail: '비동기 함수', documentation: '프로미스를 돌려줘요. 대기 로 결과를 꺼내요.' },
  { label: '시도-오류', insertText: '시도 {\n\t$1\n} 오류 (${2:e}) {\n\t$0\n}', detail: '오류 잡기', documentation: '시도 안에서 난 오류를 오류 블록에서 받아요.' },
  { label: '클래스', insertText: '클래스 ${1:이름} {\n\t생성자(${2:매개변수}) {\n\t\t$0\n\t}\n}', detail: '클래스 정의', documentation: '생성자로 필드를 초기화해요.' },
  { label: '가져오기', insertText: '가져오기 "${1:stdlib/math}"', detail: '모듈 가져오기', documentation: '표준 라이브러리 모듈이나 다른 파일을 불러와요.' },
];

/**
 * Autocomplete: snippets, keywords and built-in functions.
 */
export function createKingsejongCompletionProvider(monaco: Monaco): monacoEditor.languages.CompletionItemProvider {
  const { CompletionItemKind, CompletionItemInsertTextRule } = monaco.languages;
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
        ...SNIPPETS.map((s) => ({
          label: s.label,
          kind: CompletionItemKind.Snippet,
          insertText: s.insertText,
          insertTextRules: CompletionItemInsertTextRule.InsertAsSnippet,
          detail: s.detail,
          documentation: s.documentation,
          range,
        })),
        // A keyword with a snippet of the same name is offered once, as the snippet.
        ...[...KEYWORDS, ...TYPE_KEYWORDS, ...CONSTANTS].filter((k) => !SNIPPETS.some((s) => s.label === k)).map((k) => ({
          label: k,
          kind: CompletionItemKind.Keyword,
          insertText: k,
          range,
        })),
        ...BUILTINS.map((b) => ({
          label: b,
          kind: CompletionItemKind.Function,
          insertText: b,
          range,
        })),
      ];
      return { suggestions };
    },
  };
}

/** Which reference entry documents a word on hover. */
const HOVER_ENTRY: Record<string, string> = {
  만약: 'if', 아니면: 'if',
  반복: 'while', 동안: 'while',
  반복한다: 'repeat-n', 번: 'repeat-n',
  부터: 'range-loop', 까지: 'range-loop', 미만: 'range-loop', 이하: 'range-loop', 이상: 'range-loop', 초과: 'range-loop',
  함수: 'function', 반환: 'function',
  그리고: 'logical', 또는: 'logical',
  시도: 'try', 오류: 'try', 던지다: 'try',
  비동기: 'async', 대기: 'async',
  가져오기: 'import',
  참: 'types', 거짓: 'types', 없음: 'types',
  출력: 'print', 입력: 'input', 타입: 'type-of', 길이: 'type-of',
  정수: 'convert', 실수: 'convert', 문자열: 'convert',
  걸러낸다: 'filter', 변환한다: 'map', 축약한다: 'reduce', 찾다: 'find', 정렬한다: 'sort', 역순으로_나열한다: 'sort',
  포함: 'contains', 추가: 'contains',
  분리: 'string-functions', 찾기: 'string-functions', 바꾸기: 'string-functions', 부분문자열: 'string-functions',
};

/** Hover text for a word, in the page's language; null when the word has no entry. */
export function hoverMarkdown(word: string, locale: 'ko' | 'en'): string | null {
  const entry = REFERENCE.find((e) => e.id === HOVER_ENTRY[word]);
  if (!entry) return null;
  return [
    `**${entry.title[locale]}** · \`${entry.syntax}\``,
    entry.summary[locale],
    '```kingsejong\n' + entry.example.trimEnd() + '\n```',
  ].join('\n\n');
}

/**
 * Hover provider: the reference panel's entry for keywords and common built-ins.
 */
export function createKingsejongHoverProvider(monaco: Monaco): monacoEditor.languages.HoverProvider {
  return {
    provideHover: (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;
      const locale = typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'ko';
      // The word may carry a particle or range marker ("숫자들을", "시작부터"): try the
      // whole word, then the part before the suffix, then the suffix itself.
      const candidates: { text: string; start: number }[] = [{ text: word.word, start: word.startColumn }];
      for (const suffix of [...PARTICLES, ...RANGE_MARKERS]) {
        if (word.word.length > suffix.length && word.word.endsWith(suffix)) {
          const base = word.word.slice(0, -suffix.length);
          candidates.push({ text: base, start: word.startColumn }, { text: suffix, start: word.startColumn + base.length });
        }
      }
      for (const { text, start } of candidates) {
        const markdown = hoverMarkdown(text, locale);
        if (markdown) {
          return {
            range: new monaco.Range(position.lineNumber, start, position.lineNumber, start + text.length),
            contents: [{ value: markdown }],
          };
        }
      }
      return null;
    },
  };
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
 * Registers the KingSejong language with Monaco. Colours come from the
 * editor themes defined in CodeEditor.tsx.
 */
export function registerKingsejongLanguage(monaco: Monaco) {
  monaco.languages.register({ id: kingsejongLanguageId, extensions: ['.ksj'], aliases: ['KingSejong', '킹세종'] });
  monaco.languages.setLanguageConfiguration(kingsejongLanguageId, kingsejongLanguageConfig);
  monaco.languages.setMonarchTokensProvider(kingsejongLanguageId, kingsejongLanguageTokensProvider);
  monaco.languages.registerCompletionItemProvider(kingsejongLanguageId, createKingsejongCompletionProvider(monaco));
  monaco.languages.registerHoverProvider(kingsejongLanguageId, createKingsejongHoverProvider(monaco));
  monaco.languages.registerDocumentFormattingEditProvider(kingsejongLanguageId, createKingsejongFormattingProvider(monaco));
  monaco.languages.registerDocumentRangeFormattingEditProvider(kingsejongLanguageId, createKingsejongRangeFormattingProvider(monaco));
  monaco.languages.registerOnTypeFormattingEditProvider(kingsejongLanguageId, createKingsejongOnTypeFormattingProvider(monaco));
}
