/**
 * KingSejong language reference shown in the playground's reference panel.
 *
 * Content follows the language's own documentation (kingsejong-lang
 * docs/LANGUAGE_REFERENCE.md and docs/STDLIB_REFERENCE.md, v0.6). Every
 * `example` is a complete program that runs as written; the `# ...` comments
 * show what it prints. Builtins that touch files, the network, databases or
 * the environment are left out because the sandbox does not offer them.
 *
 * Usage:
 *   import { REFERENCE, searchReference } from '@/features/reference/entries';
 *   const hits = searchReference(REFERENCE, '반복');
 */

export type ReferenceLocale = 'ko' | 'en';

export const REFERENCE_CATEGORIES = [
  'basics',
  'operators',
  'control',
  'functions',
  'arrays',
  'josa',
  'errors',
  'builtins',
  'modules',
] as const;
export type ReferenceCategory = (typeof REFERENCE_CATEGORIES)[number];

export interface ReferenceEntry {
  id: string;
  category: ReferenceCategory;
  /** Keyword or signature as written in code. */
  syntax: string;
  title: Record<ReferenceLocale, string>;
  summary: Record<ReferenceLocale, string>;
  /** Extra search terms (English equivalents, synonyms). */
  aliases?: readonly string[];
  example: string;
}

export const REFERENCE: readonly ReferenceEntry[] = [
  // Basics
  {
    id: 'comment',
    category: 'basics',
    syntax: '# 주석',
    title: { ko: '주석', en: 'Comments' },
    summary: { ko: '# 뒤부터 줄 끝까지는 실행되지 않아요. 문장은 줄바꿈으로 끝나고 세미콜론은 쓰지 않아요.', en: 'Everything after # to the end of the line is ignored. Statements end at the line break; no semicolons.' },
    aliases: ['comment', 'semicolon', 'newline'],
    example: '# 한 줄 주석\n출력("안녕")  # 줄 끝 주석\n',
  },
  {
    id: 'variable',
    category: 'basics',
    syntax: '이름 = 값',
    title: { ko: '변수', en: 'Variables' },
    summary: { ko: '= 로 값을 담아요. 타입(정수, 실수, 문자열)을 앞에 적을 수도 있고, 생략하면 값에서 알아내요.', en: 'Assign with =. You may put a type (정수, 실수, 문자열) in front; without one the type comes from the value.' },
    aliases: ['variable', 'assign', 'let', 'var', 'type annotation'],
    example: '정수 나이 = 25\n이름 = "세종"\n나이 = 나이 + 1\n출력(이름, 나이)  # 세종 26\n',
  },
  {
    id: 'types',
    category: 'basics',
    syntax: '정수 · 실수 · 문자열 · 참/거짓 · 배열 · 없음',
    title: { ko: '값의 종류', en: 'Value types' },
    summary: { ko: '정수, 실수, 문자열, 논리값(참·거짓), 배열, 딕셔너리, 함수, 없음(null)이 있어요. 거짓, 0, 0.0, "", 없음은 거짓으로 취급해요.', en: 'Integers, floats, strings, booleans (참/거짓), arrays, dictionaries, functions and 없음 (null). 거짓, 0, 0.0, "" and 없음 count as false.' },
    aliases: ['integer', 'float', 'string', 'boolean', 'true', 'false', 'null', 'nil', 'array', 'dictionary', 'map', 'type'],
    example: '출력(42, 3.14, "글자", 참, [1, 2], 없음)\n출력(타입({"a": 1}))  # 딕셔너리\n',
  },
  {
    id: 'dictionary',
    category: 'basics',
    syntax: '{"키": 값}',
    title: { ko: '딕셔너리', en: 'Dictionaries' },
    summary: { ko: '문자열 키로 값을 찾는 묶음이에요. 사전["키"] 로 읽고 바꿔요.', en: 'Values looked up by string keys. Read and change them with 사전["키"].' },
    aliases: ['dictionary', 'dict', 'map', 'object', 'hash'],
    example: '사람 = {"이름": "철수", "나이": 25}\n사람["나이"] = 26\n출력(사람["이름"], 사람["나이"])  # 철수 26\n출력(딕셔너리_키들(사람))  # [나이, 이름]\n',
  },

  // Operators
  {
    id: 'arithmetic',
    category: 'operators',
    syntax: '+  -  *  /  %',
    title: { ko: '산술 연산', en: 'Arithmetic' },
    summary: { ko: '정수끼리 나누면 몫만 남아요. 소수가 필요하면 실수(a) / b 로 써요. 문자열 * 정수는 반복이에요.', en: 'Integer division drops the remainder; write 실수(a) / b for a fractional result. String * integer repeats the string.' },
    aliases: ['add', 'subtract', 'multiply', 'divide', 'modulo', 'remainder', 'plus', 'minus'],
    example: '출력(10 + 5, 10 - 5, 10 * 5)  # 15 5 50\n출력(7 / 2, 7 % 2)  # 3 1\n출력(실수(7) / 2)  # 3.5\n출력("=" * 5)  # =====\n',
  },
  {
    id: 'comparison',
    category: 'operators',
    syntax: '==  !=  <  >  <=  >=',
    title: { ko: '비교 연산', en: 'Comparison' },
    summary: { ko: '두 값을 비교해 참 또는 거짓을 돌려줘요.', en: 'Compares two values and gives 참 or 거짓.' },
    aliases: ['equal', 'not equal', 'less', 'greater', 'compare'],
    example: 'x = 3\ny = 5\n출력(x == y, x != y, x < y)  # 거짓 참 참\n',
  },
  {
    id: 'logical',
    category: 'operators',
    syntax: '그리고 · 또는 · !',
    title: { ko: '논리 연산', en: 'Logical operators' },
    summary: { ko: '그리고(&&), 또는(||), !(아님)으로 조건을 묶어요.', en: 'Combine conditions with 그리고 (&&), 또는 (||) and ! (not).' },
    aliases: ['and', 'or', 'not', '&&', '||'],
    example: '나이 = 20\n회원 = 참\n만약 (나이 >= 18 그리고 회원) {\n    출력("입장")\n}\n출력(!회원 또는 나이 > 30)  # 거짓\n',
  },

  // Control flow
  {
    id: 'if',
    category: 'control',
    syntax: '만약 (조건) { } 아니면 { }',
    title: { ko: '조건문', en: 'If / else' },
    summary: { ko: '조건이 참일 때만 실행해요. 아니면 만약 으로 조건을 이어 붙여요.', en: 'Runs a block only when the condition is true. Chain more conditions with 아니면 만약.' },
    aliases: ['if', 'else', 'elif', 'else if', 'condition', '아니면'],
    example: '점수 = 85\n만약 (점수 >= 90) {\n    출력("A")\n} 아니면 만약 (점수 >= 80) {\n    출력("B")\n} 아니면 {\n    출력("C")\n}\n',
  },
  {
    id: 'while',
    category: 'control',
    syntax: '반복 (조건) { }',
    title: { ko: '조건 반복', en: 'While loop' },
    summary: { ko: '조건이 참인 동안 되풀이해요. 동안 (조건) 도 같은 뜻이에요.', en: 'Repeats while the condition is true. 동안 (조건) means the same.' },
    aliases: ['while', 'loop', '동안'],
    example: 'i = 0\n반복 (i < 3) {\n    출력(i)\n    i = i + 1\n}\n',
  },
  {
    id: 'repeat-n',
    category: 'control',
    syntax: 'N번 반복한다 { }',
    title: { ko: 'N번 반복', en: 'Repeat N times' },
    summary: { ko: '정해진 횟수만큼 되풀이해요. 숫자 대신 변수를 쓸 수도 있어요(횟수번 반복한다).', en: 'Repeats a fixed number of times. A variable works too (횟수번 반복한다).' },
    aliases: ['repeat', 'times', 'loop'],
    example: '3번 반복한다 {\n    출력("안녕")\n}\n',
  },
  {
    id: 'range-loop',
    category: 'control',
    syntax: 'i가 1부터 10까지 { }',
    title: { ko: '범위 반복', en: 'Range loop' },
    summary: { ko: '까지·이하는 끝을 포함하고, 미만은 빼요. 10부터 1 이상 처럼 쓰면 거꾸로 세요.', en: '까지 and 이하 include the end, 미만 excludes it. 10부터 1 이상 counts down.' },
    aliases: ['for', 'range', 'loop', 'count', '부터', '까지', '미만', '이하', '이상'],
    example: 'i가 1부터 3까지 {\n    출력(i)\n}\ni가 0부터 3 미만 {\n    출력("미만", i)\n}\ni가 3부터 1 이상 {\n    출력("거꾸로", i)\n}\n',
  },

  // Functions
  {
    id: 'function',
    category: 'functions',
    syntax: '이름 = 함수(매개변수) { 반환 값 }',
    title: { ko: '함수', en: 'Functions' },
    summary: { ko: '함수는 값이라 변수에 담아요. 반환 으로 결과를 돌려줘요.', en: 'Functions are values stored in variables. 반환 returns the result.' },
    aliases: ['function', 'def', 'return', 'lambda', '반환'],
    example: '더하기 = 함수(a, b) {\n    반환 a + b\n}\n출력(더하기(10, 20))  # 30\n',
  },
  {
    id: 'closure',
    category: 'functions',
    syntax: '함수 안의 함수',
    title: { ko: '클로저', en: 'Closures' },
    summary: { ko: '안쪽 함수는 바깥 함수의 변수를 기억해요.', en: 'An inner function keeps the variables of the function around it.' },
    aliases: ['closure', 'counter', 'capture'],
    example: '카운터_생성 = 함수() {\n    개수 = 0\n    반환 함수() {\n        개수 = 개수 + 1\n        반환 개수\n    }\n}\n카운터 = 카운터_생성()\n출력(카운터(), 카운터())  # 1 2\n',
  },
  {
    id: 'recursion',
    category: 'functions',
    syntax: '자기 자신을 부르는 함수',
    title: { ko: '재귀', en: 'Recursion' },
    summary: { ko: '함수가 자기 자신을 불러 문제를 작게 나눠요.', en: 'A function calls itself on a smaller problem.' },
    aliases: ['recursion', 'recursive', 'factorial'],
    example: '팩토리얼 = 함수(n) {\n    만약 (n <= 1) {\n        반환 1\n    }\n    반환 n * 팩토리얼(n - 1)\n}\n출력(팩토리얼(5))  # 120\n',
  },
  {
    id: 'higher-order',
    category: 'functions',
    syntax: '함수를 넘기는 함수',
    title: { ko: '고차 함수', en: 'Higher-order functions' },
    summary: { ko: '함수를 인자로 넘기거나 돌려받을 수 있어요.', en: 'Functions can be passed as arguments and returned.' },
    aliases: ['higher-order', 'callback', 'apply'],
    example: '적용 = 함수(f, 값) {\n    반환 f(값)\n}\n제곱 = 함수(x) { 반환 x * x }\n출력(적용(제곱, 5))  # 25\n',
  },

  // Arrays
  {
    id: 'array',
    category: 'arrays',
    syntax: '[1, 2, 3]',
    title: { ko: '배열', en: 'Arrays' },
    summary: { ko: '번호는 0부터 세요. + 로 이어 붙이고, 배열[i] = 값 으로 바꿔요.', en: 'Indexes start at 0. Join arrays with + and change an element with 배열[i] = 값.' },
    aliases: ['array', 'list', 'index', 'append', 'concat'],
    example: '목록 = [10, 20, 30]\n목록[0] = 9\n목록 = 목록 + [40]\n출력(목록[0], 목록, 길이(목록))  # 9 [9, 20, 30, 40] 4\n',
  },
  {
    id: 'slice',
    category: 'arrays',
    syntax: '배열[2부터 5까지]',
    title: { ko: '배열 자르기', en: 'Slicing' },
    summary: { ko: '까지는 끝 번호를 포함하고, 미만은 포함하지 않아요.', en: '까지 includes the end index, 미만 excludes it.' },
    aliases: ['slice', 'sub array', 'range'],
    example: '수 = [1, 2, 3, 4, 5, 6]\n출력(수[1부터 3까지])  # [2, 3, 4]\n출력(수[0부터 2미만])  # [1, 2]\n',
  },
  {
    id: 'sort',
    category: 'arrays',
    syntax: '배열을 정렬한다 · 역순으로_나열한다',
    title: { ko: '정렬과 뒤집기', en: 'Sort and reverse' },
    summary: { ko: '조사를 붙여 정렬하거나 거꾸로 늘어놓은 새 배열을 얻어요.', en: 'Attach a particle to get a sorted or reversed copy of the array.' },
    aliases: ['sort', 'reverse', 'order'],
    example: '숫자들 = [3, 1, 2]\n출력(숫자들을 정렬한다)  # [1, 2, 3]\n출력(숫자들을 역순으로_나열한다)  # [2, 1, 3]\n',
  },
  {
    id: 'filter',
    category: 'arrays',
    syntax: '배열을 걸러낸다(함수)',
    title: { ko: '걸러내기', en: 'Filter' },
    summary: { ko: '함수가 참을 돌려준 요소만 남겨요.', en: 'Keeps the elements for which the function returns true.' },
    aliases: ['filter', 'select', 'where'],
    example: '숫자들 = [1, 2, 3, 4, 5, 6]\n짝수 = 숫자들을 걸러낸다(함수(x) { 반환 x % 2 == 0 })\n출력(짝수)  # [2, 4, 6]\n',
  },
  {
    id: 'map',
    category: 'arrays',
    syntax: '배열을 변환한다(함수)',
    title: { ko: '변환하기', en: 'Map' },
    summary: { ko: '모든 요소에 함수를 적용한 새 배열을 만들어요.', en: 'Builds a new array by applying the function to every element.' },
    aliases: ['map', 'transform'],
    example: '숫자들 = [1, 2, 3]\n제곱들 = 숫자들을 변환한다(함수(x) { 반환 x * x })\n출력(제곱들)  # [1, 4, 9]\n',
  },
  {
    id: 'reduce',
    category: 'arrays',
    syntax: '배열을 축약한다(초깃값, 함수)',
    title: { ko: '하나로 모으기', en: 'Reduce' },
    summary: { ko: '초깃값부터 요소를 하나씩 더해 값 하나로 줄여요.', en: 'Folds the elements into one value, starting from the initial value.' },
    aliases: ['reduce', 'fold', 'sum', 'accumulate'],
    example: '숫자들 = [1, 2, 3, 4, 5]\n합계 = 숫자들을 축약한다(0, 함수(누적, 현재) { 반환 누적 + 현재 })\n출력(합계)  # 15\n',
  },
  {
    id: 'find',
    category: 'arrays',
    syntax: '배열을 찾다(함수)',
    title: { ko: '찾기', en: 'Find' },
    summary: { ko: '함수가 처음으로 참을 돌려준 요소를 꺼내요.', en: 'Returns the first element for which the function returns true.' },
    aliases: ['find', 'first', 'search'],
    example: '숫자들 = [3, 5, 12, 15]\n출력(숫자들을 찾다(함수(x) { 반환 x > 10 }))  # 12\n',
  },
  {
    id: 'chain',
    category: 'arrays',
    syntax: '…을 걸러낸다(…)을 변환한다(…)',
    title: { ko: '이어 쓰기', en: 'Chaining' },
    summary: { ko: '결과에 바로 다음 조사를 붙여요. 왼쪽부터 차례로 적용돼요.', en: 'Attach the next particle to the result; steps apply left to right.' },
    aliases: ['chain', 'pipeline'],
    example: '결과 = [1, 2, 3, 4, 5, 6]을 걸러낸다(함수(x) { 반환 x % 2 == 0 })을 변환한다(함수(x) { 반환 x * x })\n출력(결과)  # [4, 16, 36]\n',
  },

  // Josa (particles)
  {
    id: 'josa-call',
    category: 'josa',
    syntax: '값을 함수(인자)',
    title: { ko: '조사로 부르기', en: 'Calling with particles' },
    summary: { ko: '값을 함수(인자) 는 함수(값, 인자) 와 같아요. 받침이 있으면 을·이·은, 없으면 를·가·는을 써요.', en: '값을 함수(인자) is 함수(값, 인자). Use 을/이/은 after a final consonant, 를/가/는 after a vowel.' },
    aliases: ['josa', 'particle', '을', '를', '이', '가', '은', '는', 'method'],
    example: '크다 = 함수(값, 기준) { 반환 값 > 기준 }\n점수 = 10\n출력(점수는 크다(5))  # 참\n문장 = "안녕하세요"\n출력(문장을 길이)  # 5\n',
  },
  {
    id: 'josa-possessive',
    category: 'josa',
    syntax: '사전의 키',
    title: { ko: '의 (소유격)', en: '의 (possessive)' },
    summary: { ko: '의 로 딕셔너리의 키나 객체의 필드를 읽어요.', en: '의 reads a dictionary key or an object field.' },
    aliases: ['possessive', 'field', 'property', 'of'],
    example: '사용자 = {"이름": "세종"}\n출력(사용자의 이름)  # 세종\n',
  },
  {
    id: 'josa-convert',
    category: 'josa',
    syntax: '값을 정수로 변환한다',
    title: { ko: '로 변환한다', en: 'Converting with 로' },
    summary: { ko: '값을 함수로 변환한다 는 함수(값) 이에요. 받침 뒤에는 으로, ㄹ받침 뒤에는 로를 써요.', en: '값을 함수로 변환한다 is 함수(값). Use 으로 after a final consonant, but 로 after ㄹ.' },
    aliases: ['convert', 'cast', 'parse', '바꾼다', '변환한다', '으로'],
    example: '숫자 = "42"를 정수로 변환한다\n출력(숫자 + 1)  # 43\n출력(숫자를 문자열로 변환한다 + "점")  # 42점\n',
  },

  // Errors and async
  {
    id: 'try',
    category: 'errors',
    syntax: '시도 { } 오류 (e) { }',
    title: { ko: '오류 잡기', en: 'Try / catch' },
    summary: { ko: '시도 안에서 난 오류를 오류 (e) 블록에서 받아요. 던지다 로 오류를 직접 낼 수 있어요.', en: 'Errors raised inside 시도 arrive in the 오류 (e) block. Raise one yourself with 던지다.' },
    aliases: ['try', 'catch', 'throw', 'exception', 'error', '던지다'],
    example: '시도 {\n    정수("abc")\n} 오류 (e) {\n    출력("잡았다:", e)\n}\n',
  },
  {
    id: 'async',
    category: 'errors',
    syntax: '비동기 함수 · 대기',
    title: { ko: '비동기 함수와 대기', en: 'Async and await' },
    summary: { ko: '비동기 함수는 프로미스를 돌려주고, 대기 로 결과를 꺼내요. 그러면·오류시 로 이어 쓸 수도 있어요.', en: 'An async function returns a promise; 대기 waits for its value. 그러면 and 오류시 chain callbacks.' },
    aliases: ['async', 'await', 'promise', 'then', 'catch', '그러면', '오류시'],
    example: '덧셈 = 비동기 함수(a, b) {\n    반환 a + b\n}\n출력(대기 덧셈(10, 20))  # 30\n결과 = 덧셈(1, 2).그러면(함수(값) { 반환 값 * 10 })\n출력(대기 결과)  # 30\n',
  },

  // Builtins
  {
    id: 'print',
    category: 'builtins',
    syntax: '출력(값, ...)',
    title: { ko: '출력', en: 'Print' },
    summary: { ko: '값들을 공백으로 이어 한 줄로 출력해요.', en: 'Prints the values on one line, separated by spaces.' },
    aliases: ['print', 'println', 'console', 'log', 'output'],
    example: '출력("안녕", 42, [1, "a"])  # 안녕 42 [1, a]\n',
  },
  {
    id: 'input',
    category: 'builtins',
    syntax: '입력([안내])',
    title: { ko: '입력', en: 'Input' },
    summary: { ko: '표준 입력에서 한 줄을 읽어 문자열로 돌려줘요. 더 읽을 줄이 없으면 없음이에요. 프로그램 입력(stdin) 칸에 값을 적고 실행해요.', en: 'Reads one line of standard input as a string, or 없음 when there is none left. Type the values in the program input (stdin) box before running.' },
    aliases: ['input', 'stdin', 'read', 'scanf', 'readline'],
    example: '이름 = 입력("이름: ")\n만약 (이름 == 없음) {\n    이름 = "손님"\n}\n출력("안녕하세요, " + 이름 + "님")\n',
  },
  {
    id: 'type-of',
    category: 'builtins',
    syntax: '타입(값) · 길이(값)',
    title: { ko: '타입과 길이', en: 'Type and length' },
    summary: { ko: '타입은 값의 종류 이름을, 길이는 글자 수나 요소 수를 돌려줘요.', en: '타입 gives the name of the value type; 길이 counts characters or elements.' },
    aliases: ['type', 'typeof', 'length', 'len', 'size', 'count'],
    example: '출력(타입(42), 타입("a"), 타입([1]))  # 정수 문자열 배열\n출력(길이("안녕하세요"), 길이([1, 2, 3]))  # 5 3\n',
  },
  {
    id: 'convert',
    category: 'builtins',
    syntax: '문자열(값) · 정수(값) · 실수(값)',
    title: { ko: '타입 바꾸기', en: 'Conversions' },
    summary: { ko: '정수는 소수점 아래를 버려요. 숫자로 바꿀 수 없는 문자열은 오류예요.', en: '정수 drops the fractional part. A string that is not a number raises an error.' },
    aliases: ['string', 'int', 'float', 'parse', 'cast', 'str', 'tostring'],
    example: '출력("점수: " + 문자열(95))  # 점수: 95\n출력(정수("42") + 1, 정수(3.9))  # 43 3\n출력(실수("2.5") * 2)  # 5\n',
  },
  {
    id: 'string-functions',
    category: 'builtins',
    syntax: '분리 · 찾기 · 바꾸기 · 부분문자열',
    title: { ko: '문자열 다루기', en: 'String functions' },
    summary: { ko: '나누고, 위치를 찾고, 바꾸고, 잘라 내요. 위치는 글자 단위로 0부터 세요.', en: 'Split, find, replace and cut strings. Positions count characters from 0.' },
    aliases: ['split', 'find', 'indexOf', 'replace', 'substring', 'substr', 'upper', 'lower', '대문자', '소문자'],
    example: '출력(분리("a,b,c", ","))  # [a, b, c]\n출력(찾기("안녕하세요", "하세"))  # 2\n출력(바꾸기("hello", "l", "L"))  # heLLo\n출력(부분문자열("안녕하세요", 1, 3))  # 녕하\n출력(대문자("abc"))  # ABC\n',
  },
  {
    id: 'contains',
    category: 'builtins',
    syntax: '포함(묶음, 값) · 추가(배열, 값)',
    title: { ko: '포함과 추가', en: 'Contains and append' },
    summary: { ko: '포함은 문자열·배열·딕셔너리에서 값을 찾아요. 추가는 값을 붙인 새 배열을 돌려주고 원본은 그대로예요.', en: '포함 looks for a value in a string, array or dictionary. 추가 returns a new array with the value appended and leaves the original alone.' },
    aliases: ['contains', 'includes', 'has', 'in', 'append', 'push', 'add'],
    example: '출력(포함("안녕하세요", "녕하"), 포함([1, 2, 3], 4))  # 참 거짓\n원본 = [1, 2]\n출력(원본, 추가(원본, 3))  # [1, 2] [1, 2, 3]\n',
  },
  {
    id: 'math-builtins',
    category: 'builtins',
    syntax: '반올림 · 올림 · 내림 · 절대값 · 제곱 · 제곱근',
    title: { ko: '수학 함수', en: 'Math functions' },
    summary: { ko: '가져오기 없이 쓰는 수학 함수예요. 제곱근은 항상 실수를 돌려줘요.', en: 'Math functions available without an import. 제곱근 always returns a float.' },
    aliases: ['round', 'ceil', 'floor', 'abs', 'pow', 'power', 'sqrt', 'math'],
    example: '출력(반올림(2.5), 올림(3.2), 내림(3.8))  # 3 4 3\n출력(절대값(-5), 제곱(2, 10), 제곱근(16))  # 5 1024 4\n',
  },
  {
    id: 'random',
    category: 'builtins',
    syntax: '랜덤_숫자(최소, 최대)',
    title: { ko: '난수', en: 'Random numbers' },
    summary: { ko: '최소부터 최대까지(둘 다 포함) 정수 하나를 골라요.', en: 'Picks an integer from min to max, both included.' },
    aliases: ['random', 'rand', 'dice'],
    example: '주사위 = 랜덤_숫자(1, 6)\n출력("주사위:", 주사위)\n',
  },
  {
    id: 'time',
    category: 'builtins',
    syntax: '현재_날짜() · 현재_시각()',
    title: { ko: '날짜와 시간', en: 'Date and time' },
    summary: { ko: '서버의 현재 날짜와 시각을 문자열로 돌려줘요. 현재_시간() 은 Unix 초예요.', en: 'Current date and time on the server, as strings. 현재_시간() gives Unix seconds.' },
    aliases: ['date', 'time', 'now', 'clock', 'timestamp'],
    example: '출력(현재_날짜(), 현재_시각())\n',
  },
  {
    id: 'regex',
    category: 'builtins',
    syntax: '정규표현식_모두_찾기(문자열, 패턴)',
    title: { ko: '정규표현식', en: 'Regular expressions' },
    summary: { ko: '인자는 (대상, 패턴) 순서예요. 역슬래시는 \\\\d 처럼 두 번 써요.', en: 'Arguments are (text, pattern). Write backslashes twice, as in \\\\d.' },
    aliases: ['regex', 'regexp', 'pattern', 'match', 'replace'],
    example: '출력(정규표현식_모두_찾기("a1b22c333", "[0-9]+"))  # [1, 22, 333]\n출력(정규표현식_치환("hello world", "(\\\\w+) (\\\\w+)", "$2 $1"))  # world hello\n',
  },
  {
    id: 'json',
    category: 'builtins',
    syntax: 'JSON_문자열화(값) · JSON_파싱(문자열)',
    title: { ko: 'JSON', en: 'JSON' },
    summary: { ko: 'JSON 객체는 [["키", 값], ...] 쌍 배열로 다뤄요. 딕셔너리는 바로 바꿀 수 없어요.', en: 'JSON objects are pair arrays, [["key", value], ...]. Dictionaries are not converted directly.' },
    aliases: ['json', 'stringify', 'parse', 'serialize'],
    example: '출력(JSON_문자열화([1, "a", 참, 없음]))  # [1,"a",true,null]\n출력(JSON_파싱("{\\"age\\": 30}"))  # [[age, 30]]\n',
  },

  // Modules
  {
    id: 'import',
    category: 'modules',
    syntax: '가져오기 "stdlib/math"',
    title: { ko: '모듈 가져오기', en: 'Imports' },
    summary: { ko: '표준 라이브러리 모듈이나 같은 폴더의 다른 파일을 불러와요. 파일의 최상위 이름이 모두 들어와요.', en: 'Loads a standard library module or another file of the program. Every top-level name in it becomes available.' },
    aliases: ['import', 'include', 'require', 'module', 'stdlib'],
    example: '가져오기 "stdlib/math"\n출력(최대공약수(12, 18))  # 6\n',
  },
  {
    id: 'stdlib-math',
    category: 'modules',
    syntax: 'stdlib/math',
    title: { ko: 'math 모듈', en: 'math module' },
    summary: { ko: '절댓값, 거듭제곱, 계승, 최대공약수, 소수인가, 평균 같은 함수와 파이, 자연상수가 있어요.', en: 'Functions such as 절댓값, 거듭제곱, 계승, 최대공약수, 소수인가 and 평균, plus the constants 파이 and 자연상수.' },
    aliases: ['math', 'gcd', 'lcm', 'prime', 'factorial', 'average', 'mean', 'pi'],
    example: '가져오기 "stdlib/math"\n출력(거듭제곱(2, 10), 계승(5))  # 1024 120\n출력(소수인가(17), 평균([1, 2, 3]))  # 참 2\n',
  },
  {
    id: 'stdlib-string',
    category: 'modules',
    syntax: 'stdlib/string',
    title: { ko: 'string 모듈', en: 'string module' },
    summary: { ko: '반복, 결합, 역순, 채우기, 줄_만들기 같은 문자열 편의 함수가 있어요.', en: 'String helpers such as 반복, 결합, 역순, padding and 줄_만들기.' },
    aliases: ['string', 'join', 'repeat', 'pad', 'reverse'],
    example: '가져오기 "stdlib/string"\n출력(결합([1, 2, 3], ", "))  # 1, 2, 3\n출력(줄_만들기(10, "="))  # ==========\n',
  },
  {
    id: 'stdlib-array',
    category: 'modules',
    syntax: 'stdlib/array',
    title: { ko: 'array 모듈', en: 'array module' },
    summary: { ko: '범위, 중복_제거, 모두, 일부, 그룹_나누기, 쌍으로_묶기 같은 배열 함수가 있어요.', en: 'Array helpers such as 범위, 중복_제거, 모두 (every), 일부 (some), 그룹_나누기 (chunk) and 쌍으로_묶기 (zip).' },
    aliases: ['array', 'range', 'unique', 'distinct', 'every', 'some', 'chunk', 'zip'],
    example: '가져오기 "stdlib/array"\n출력(범위(1, 5))  # [1, 2, 3, 4, 5]\n출력(중복_제거([1, 2, 2, 3]))  # [1, 2, 3]\n',
  },
];

/** Lower-case, NFC-normalised text for matching Korean and English alike. */
function norm(text: string): string {
  return text.normalize('NFC').toLowerCase();
}

/**
 * Entries matching every whitespace-separated term of `query`. Titles, syntax,
 * aliases, summaries and examples are searched in both locales. Entries whose
 * title, syntax or aliases contain every term come first; otherwise reference
 * order is kept.
 */
export function searchReference(entries: readonly ReferenceEntry[], query: string): ReferenceEntry[] {
  const terms = norm(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [...entries];
  const scored: { entry: ReferenceEntry; strong: boolean }[] = [];
  for (const e of entries) {
    const name = norm([e.syntax, e.title.ko, e.title.en, ...(e.aliases ?? [])].join('\n'));
    const body = norm([e.summary.ko, e.summary.en, e.example].join('\n'));
    if (!terms.every((t) => name.includes(t) || body.includes(t))) continue;
    scored.push({ entry: e, strong: terms.every((t) => name.includes(t)) });
  }
  return [...scored.filter((s) => s.strong), ...scored.filter((s) => !s.strong)].map((s) => s.entry);
}
