import { workspacePath } from '../paths';

describe('workspacePath', () => {
  it('maps sandbox paths to workspace file names', () => {
    expect(workspacePath('./main.go')).toBe('main.go');
    expect(workspacePath('/workspace/lib/util.ksj')).toBe('lib/util.ksj');
    expect(workspacePath('main.py')).toBe('main.py');
  });
});
