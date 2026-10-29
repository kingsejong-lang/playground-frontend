import { render } from '@testing-library/react';
import { AnsiText, countMatches, parseAnsi, stripAnsi } from '../ansi-parser';

const ESC = '\x1b';

describe('ANSI output', () => {
  it('splits text into styled segments and resets on 0', () => {
    expect(parseAnsi(`plain ${ESC}[31;1mred bold${ESC}[0m end`)).toEqual([
      { text: 'plain ', classes: [] },
      { text: 'red bold', classes: ['text-ansi-1', 'font-bold'] },
      { text: ' end', classes: [] },
    ]);
  });

  it('maps bright colours and backgrounds to the theme tokens and ignores unknown codes', () => {
    const [seg] = parseAnsi(`${ESC}[92;44;99mx`);
    expect(seg.classes).toEqual(['text-ansi-10', 'bg-ansi-4/20']);
  });

  it('returns the whole text as one segment when there are no codes', () => {
    expect(parseAnsi('')).toEqual([{ text: '', classes: [] }]);
  });

  it('strips codes for copy and download', () => {
    expect(stripAnsi(`${ESC}[32mok${ESC}[0m`)).toBe('ok');
  });

  it('counts case-insensitive matches', () => {
    expect(countMatches('Tick tick TICK', 'tick')).toBe(3);
    expect(countMatches('abc', '')).toBe(0);
  });

  it('renders styled spans and highlights search matches with <mark>', () => {
    const { container } = render(<AnsiText highlight="err">{`${ESC}[31mError${ESC}[0m and error`}</AnsiText>);
    expect(container.querySelector('span.text-ansi-1')?.textContent).toBe('Error');
    expect([...container.querySelectorAll('mark')].map((m) => m.textContent)).toEqual(['Err', 'err']);
  });
});
