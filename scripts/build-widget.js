#!/usr/bin/env node

import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(rootDir, 'public');
await mkdir(publicDir, { recursive: true });

await build({
  entryPoints: [join(rootDir, 'src/widget/index.ts')],
  bundle: true,
  minify: true,
  format: 'iife',
  outfile: join(publicDir, 'board.js'),
});

console.log('Built BugDrop Board bundle');
