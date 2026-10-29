import { insertionEdit } from '../CodeEditor';

const at = (line: number, column: number) => ({ startLineNumber: line, startColumn: column, endLineNumber: line, endColumn: column, isEmpty: true });

describe('insertionEdit', () => {
  it('inserts at the cursor on an empty line, ending with a newline', () => {
    expect(insertionEdit(at(3, 1), '', '출력(1)')).toEqual({ range: { startLineNumber: 3, startColumn: 1, endLineNumber: 3, endColumn: 1 }, text: '출력(1)\n' });
  });

  it('puts the text on a new line below a line with code', () => {
    expect(insertionEdit(at(2, 3), 'x = 1', '출력(x)\n')).toEqual({
      range: { startLineNumber: 2, startColumn: 6, endLineNumber: 2, endColumn: 6 },
      text: '\n출력(x)',
    });
  });

  it('replaces a selection', () => {
    const selection = { startLineNumber: 1, startColumn: 1, endLineNumber: 2, endColumn: 4, isEmpty: false };
    expect(insertionEdit(selection, 'abc', 'y\n').text).toBe('y\n');
    expect(insertionEdit(selection, 'abc', 'y\n').range).toEqual({ startLineNumber: 1, startColumn: 1, endLineNumber: 2, endColumn: 4 });
  });
});
