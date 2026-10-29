#!/usr/bin/env node
/**
 * Copies Monaco's prebuilt AMD bundle (node_modules/monaco-editor/min/vs) to
 * public/monaco/<version>/vs so the editor loads from this site instead of a
 * CDN. The version is part of the path, so next.config can serve it as
 * immutable. Runs after `npm install` and before `next build`/`next dev`;
 * it skips the copy when that version is already there and removes other
 * versions.
 *
 * Usage: node scripts/copy-monaco.mjs
 */
import { cpSync, existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgDir = join(root, 'node_modules', 'monaco-editor');
const { version } = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
const publicDir = join(root, 'public', 'monaco');
const target = join(publicDir, version, 'vs');

if (existsSync(publicDir)) {
  for (const name of readdirSync(publicDir)) if (name !== version) rmSync(join(publicDir, name), { recursive: true, force: true });
}
if (existsSync(join(target, 'loader.js'))) {
  console.log(`monaco-editor ${version}: already in public/monaco`);
} else {
  cpSync(join(pkgDir, 'min', 'vs'), target, { recursive: true });
  console.log(`monaco-editor ${version}: copied to public/monaco/${version}/vs`);
}
