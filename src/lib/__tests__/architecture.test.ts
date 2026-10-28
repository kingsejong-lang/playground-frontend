/**
 * Structural rules (specs 02/03/04): checked by reading the source tree.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(process.cwd(), 'src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === '__tests__' || name === 'test' ? [] : sourceFiles(p);
    return /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

const files = sourceFiles(SRC).map((p) => ({ path: relative(SRC, p), text: readFileSync(p, 'utf8') }));

describe('architecture', () => {
  it('only lib/rpc imports @connectrpc/*', () => {
    const offenders = files.filter((f) => /from '@connectrpc\//.test(f.text) && !f.path.startsWith('lib/rpc/'));
    expect(offenders.map((f) => f.path)).toEqual([]);
  });

  it('no feature or component calls fetch, WebSocket or EventSource directly', () => {
    const offenders = files.filter((f) => !f.path.startsWith('lib/rpc/') && /\bfetch\(|new WebSocket|new EventSource/.test(f.text));
    expect(offenders.map((f) => f.path)).toEqual([]);
  });

  it('removed transports are gone', () => {
    const offenders = files.filter((f) => /from '(axios|grpc-web|google-protobuf)'|X-CSRF-Token|getCsrfToken|from '[^']*csrf'/.test(f.text));
    expect(offenders.map((f) => f.path)).toEqual([]);
  });

  it('zod is imported only through lib/zod (jitless, CSP-safe)', () => {
    const allowed = ['lib/zod.ts'];
    const users = files.filter((f) => /from 'zod'/.test(f.text)).map((f) => f.path);
    expect(users.filter((p) => !allowed.includes(p))).toEqual([]);
  });

  it('no HTML injection sinks (shared titles render as text)', () => {
    const offenders = files.filter((f) => /dangerouslySetInnerHTML|\.innerHTML\s*=/.test(f.text));
    expect(offenders.map((f) => f.path)).toEqual([]);
  });

  it('no tokens in JS-accessible storage', () => {
    const offenders = files.filter((f) => /(localStorage|sessionStorage)\.\w+\([^)]*(token|jwt|auth)/i.test(f.text) || /document\.cookie/.test(f.text));
    expect(offenders.map((f) => f.path)).toEqual([]);
  });

  it('pages do not call RPC clients directly', () => {
    const pages = files.filter((f) => f.path.startsWith('app/') && f.path.endsWith('page.tsx') && !f.path.includes('embed'));
    expect(pages.filter((f) => /api\.(language|execution|share|settings|auth)\./.test(f.text)).map((f) => f.path)).toEqual([]);
  });
});
