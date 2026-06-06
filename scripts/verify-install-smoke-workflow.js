#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import process from 'node:process';

const workflowPath = '.github/workflows/install-smoke.yml';
const workflow = readFileSync(workflowPath, 'utf8');

const required = [
  'name: Install Smoke',
  'workflow_dispatch:',
  'package_version:',
  'default: latest',
  'uses: actions/checkout@v5',
  'uses: actions/setup-node@v5',
  'make install',
  'npx playwright install --with-deps chromium',
  'npm run install:smoke --',
  '--version "$PACKAGE_VERSION"',
];
const forbidden = ['secrets.', 'npm publish', 'wrangler deploy'];

const missing = required.filter(text => !workflow.includes(text));
const presentForbidden = forbidden.filter(text => workflow.includes(text));

if (missing.length > 0 || presentForbidden.length > 0) {
  if (missing.length > 0) {
    console.error(`Missing required workflow text:\n${missing.join('\n')}`);
  }
  if (presentForbidden.length > 0) {
    console.error(`Forbidden workflow text present:\n${presentForbidden.join('\n')}`);
  }
  process.exit(1);
}

console.log(`${workflowPath} matches the install-smoke workflow contract`);
