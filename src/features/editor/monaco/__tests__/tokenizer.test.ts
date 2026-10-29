/**
 * The KingSejong Monarch tokenizer, run by the real Monaco engine on snippets
 * and on example programs from kingsejong-lang (fixtures/).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
// The ESM entry has no type declarations of its own; it is the same API as 'monaco-editor'.
// @ts-expect-error -- typed through the cast below
import * as monacoApi from 'monaco-editor/esm/vs/editor/editor.api';
import {
  BUILTINS,
  CONSTANTS,
  KEYWORDS,
  PARTICLES,
  RANGE_MARKERS,
  TYPE_KEYWORDS,
  kingsejongLanguageConfig,
  kingsejongLanguageId,
  kingsejongLanguageTokensProvider,
} from '../kingsejong-language';

const monaco = monacoApi as typeof import('monaco-editor');

beforeAll(() => {
  monaco.languages.register({ id: kingsejongLanguageId });
  monaco.languages.setMonarchTokensProvider(kingsejongLanguageId, kingsejongLanguageTokensProvider);
});

/** [text, token type without the ".ksj" postfix] per token, whitespace dropped, per line. */
function tokenize(source: string): [string, string][][] {
  const lines = source.split('\n');
  return monaco.editor.tokenize(source, kingsejongLanguageId).map((tokens, i) =>
    tokens
      .map((t, j): [string, string] => [lines[i].slice(t.offset, tokens[j + 1]?.offset ?? lines[i].length), t.type.replace(/\.ksj$/, '')])
      .filter(([text]) => text.trim() !== '')
  );
}
const line = (source: string) => tokenize(source)[0];

describe('KingSejong tokens', () => {
  it('comments: #, // and /* */', () => {
    expect(line('출력(1)  # 끝')).toContainEqual(['# 끝', 'comment']);
    expect(line('// 한 줄')).toEqual([['// 한 줄', 'comment']]);
    const block = tokenize('/* 여러\n줄 */ x');
    expect(block[0]).toEqual([['/* 여러', 'comment']]);
    expect(block[1]).toEqual([['줄 */', 'comment'], ['x', 'identifier']]);
    // # inside a string is not a comment.
    expect(line('"#태그"')).toEqual([['"', 'string.quote'], ['#태그', 'string'], ['"', 'string.quote']]);
  });

  it('strings in both quotes with escapes', () => {
    expect(line('\'a\\\'b\\n\'')).toEqual([
      ["'", 'string.quote'],
      ['a', 'string'],
      ["\\'", 'string.escape'],
      ['b', 'string'],
      ['\\n', 'string.escape'],
      ["'", 'string.quote'],
    ]);
  });

  it('numbers: integers and decimals with digits on both sides', () => {
    expect(line('x = 3.14 + 2')).toEqual([['x', 'identifier'], ['=', 'operator'], ['3.14', 'number.float'], ['+', 'operator'], ['2', 'number']]);
    expect(line('1.')).toEqual([['1', 'number'], ['.', 'delimiter']]);
  });

  it('keywords, types and constants from the lexer table', () => {
    expect(line('만약 (참 그리고 x != 없음) {')).toEqual([
      ['만약', 'keyword'], ['(', 'delimiter.parenthesis'], ['참', 'constant'], ['그리고', 'keyword'], ['x', 'identifier'],
      ['!=', 'operator'], ['없음', 'constant'], [')', 'delimiter.parenthesis'], ['{', 'delimiter.curly'],
    ]);
    expect(line('정수 나이 = 25')[0]).toEqual(['정수', 'type']);
    // English words are identifiers, not keywords.
    for (const word of ['function', 'if', 'print', 'return', 'while']) expect(line(word)).toEqual([[word, 'identifier']]);
  });

  it('range loop: particle and range markers split off the words', () => {
    expect(line('i가 1부터 10까지 {')).toEqual([
      ['i', 'identifier'], ['가', 'keyword.josa'], ['1', 'number'], ['부터', 'keyword.range'], ['10', 'number'], ['까지', 'keyword.range'], ['{', 'delimiter.curly'],
    ]);
    expect(line('i가 시작부터 끝까지 {').slice(2, 6)).toEqual([['시작', 'identifier'], ['부터', 'keyword.range'], ['끝', 'identifier'], ['까지', 'keyword.range']]);
    expect(line('횟수번 반복한다 {').slice(0, 3)).toEqual([['횟수', 'identifier'], ['번', 'keyword.range'], ['반복한다', 'keyword']]);
  });

  it('particle calls: split only when a word, number or string follows', () => {
    expect(line('짝수 = 숫자들을 걸러낸다(f)').slice(2, 5)).toEqual([['숫자들', 'identifier'], ['을', 'keyword.josa'], ['걸러낸다', 'predefined']]);
    expect(line('목록을 길이 == 3').slice(0, 3)).toEqual([['목록', 'identifier'], ['을', 'keyword.josa'], ['길이', 'predefined']]);
    expect(line('숫자 = "42"를 정수로 변환한다').slice(2)).toEqual([
      ['"', 'string.quote'], ['42', 'string'], ['"', 'string.quote'], ['를', 'keyword.josa'], ['정수', 'type'], ['로', 'keyword.josa'], ['변환한다', 'predefined'],
    ]);
    // Not split: an operator, a bracket, the end of the line or a keyword follows.
    expect(line('마을 = 1')[0]).toEqual(['마을', 'identifier']);
    expect(line('출력(소수인가)')[2]).toEqual(['소수인가', 'identifier']);
    expect(line('최소길이 미만')).toEqual([['최소길이', 'identifier'], ['미만', 'keyword.range']]);
    expect(line('참거짓을_문자열로(x)')[0]).toEqual(['참거짓을_문자열로', 'identifier']);
    // A particle written as its own word after a bracket.
    expect(line('[3, 1]을 정렬한다').slice(-2)).toEqual([['을', 'keyword.josa'], ['정렬한다', 'predefined']]);
  });
});

describe('example programs from kingsejong-lang', () => {
  const dir = join(__dirname, 'fixtures');
  const files = readdirSync(dir).filter((f) => f.endsWith('.ksj'));
  const reserved = new Set([...KEYWORDS, ...TYPE_KEYWORDS, ...CONSTANTS, ...PARTICLES, ...RANGE_MARKERS]);

  it('has fixtures', () => expect(files.length).toBeGreaterThanOrEqual(8));

  it.each(files)('%s: comments, keywords and strings are recognised', (file) => {
    const source = readFileSync(join(dir, file), 'utf8');
    const lines = source.split('\n');
    const tokens = tokenize(source);
    tokens.forEach((lineTokens, i) => {
      const text = lines[i].trim();
      // Comment lines are comments from the first character.
      if (text.startsWith('#')) expect(lineTokens).toEqual([[text, 'comment']]);
      for (const [word, type] of lineTokens) {
        // No reserved word is ever left as a plain identifier.
        if (type === 'identifier') expect(reserved.has(word), `${file}:${i + 1} ${word}`).toBe(false);
        // Built-ins are marked wherever they appear as whole words.
        if (BUILTINS.includes(word)) expect(type, `${file}:${i + 1} ${word}`).toBe('predefined');
      }
    });
    // Every string literal opens and closes on its line in these programs.
    tokens.forEach((lineTokens, i) => {
      // Adjacent quotes ("") arrive as one token, so count characters.
      const quotes = lineTokens.filter(([, type]) => type === 'string.quote').reduce((n, [text]) => n + text.length, 0);
      expect(quotes % 2, `${file}:${i + 1} ${lines[i]}`).toBe(0);
    });
  });

  it('class example: class, constructor and visibility keywords', () => {
    const tokens = tokenize(readFileSync(join(dir, 'class_example.ksj'), 'utf8')).flat();
    for (const [word, type] of [['클래스', 'keyword'], ['비공개', 'keyword'], ['생성자', 'keyword'], ['문자열', 'type']]) {
      expect(tokens).toContainEqual([word, type]);
    }
  });

  it('exception and async examples: 시도, 오류, 던지다, 비동기, 대기', () => {
    const exc = tokenize(readFileSync(join(dir, 'exception_handling.ksj'), 'utf8')).flat();
    expect(exc).toContainEqual(['시도', 'keyword']);
    expect(exc).toContainEqual(['오류', 'keyword']);
    const asyncTokens = tokenize(readFileSync(join(dir, 'async_await.ksj'), 'utf8')).flat();
    expect(asyncTokens).toContainEqual(['비동기', 'keyword']);
    expect(asyncTokens).toContainEqual(['대기', 'keyword']);
  });
});

describe('language configuration', () => {
  it('comments with # and indents after an opening bracket', () => {
    expect(kingsejongLanguageConfig.comments?.lineComment).toBe('#');
    const { increaseIndentPattern, decreaseIndentPattern } = kingsejongLanguageConfig.indentationRules!;
    expect(increaseIndentPattern.test('만약 (x > 0) {')).toBe(true);
    expect(increaseIndentPattern.test('목록 = [  # 숫자들')).toBe(true);
    expect(increaseIndentPattern.test('출력(1)')).toBe(false);
    expect(decreaseIndentPattern.test('    } 아니면 {')).toBe(true);
  });

  it('selects whole Hangul words', () => {
    const word = kingsejongLanguageConfig.wordPattern!;
    expect('숫자들을 걸러낸다'.match(new RegExp(word.source, 'g'))).toEqual(['숫자들을', '걸러낸다']);
  });
});
