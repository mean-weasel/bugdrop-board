#!/usr/bin/env node

import { build } from 'esbuild';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(rootDir, 'public');
const packageJson = JSON.parse(await readFile(join(rootDir, 'package.json'), 'utf8'));
const version = process.env.VERSION ?? packageJson.version;

await mkdir(publicDir, { recursive: true });

await build({
  entryPoints: [join(rootDir, 'src/widget/index.ts')],
  bundle: true,
  minify: true,
  format: 'iife',
  define: {
    __BUGDROP_BOARD_VERSION__: JSON.stringify(version.replace(/^v/, '')),
  },
  outfile: join(publicDir, 'board.js'),
});

console.log(`Built BugDrop Board bundle ${version.replace(/^v/, '')}`);
