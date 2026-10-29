import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MONACO_VERSION, MONACO_VS_PATH } from '../CodeEditor';

describe('self-hosted Monaco', () => {
  it('loads the exact monaco-editor version pinned in package.json', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
    expect(pkg.dependencies['monaco-editor']).toBe(MONACO_VERSION);
    expect(MONACO_VS_PATH).toBe(`/monaco/${MONACO_VERSION}/vs`);
  });
});
