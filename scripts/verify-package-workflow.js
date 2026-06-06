#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import process from 'node:process';

const workflowPath = '.github/workflows/package.yml';
const workflow = readFileSync(workflowPath, 'utf8');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function requireText(text) {
  if (!workflow.includes(text)) {
    fail(`Missing required workflow text: ${text}`);
  }
}

function releaseSmokeArgs() {
  const match = workflow.match(/npm run release:smoke --(?<args>[^\n]+)/);
  if (!match?.groups?.args) {
    fail('Package Widget workflow must run release:smoke after publish');
  }
  return match.groups.args;
}

function numericFlag(args, flag) {
  const match = args.match(new RegExp(`${flag} (?<value>\\d+)`));
  if (!match?.groups?.value) {
    fail(`Package Widget release smoke must pass ${flag}`);
  }
  return Number.parseInt(match.groups.value, 10);
}

requireText('name: Package Widget');
requireText('workflow_dispatch:');
requireText('npm publish --access public --tag "$NPM_TAG"');
requireText('name: Verify published package');
requireText('timeout-minutes: 25');

const args = releaseSmokeArgs();
const retries = numericFlag(args, '--retries');
const retryDelayMs = numericFlag(args, '--retry-delay-ms');

if (retries < 90) {
  fail(`Package Widget release smoke retries must be at least 90, got ${retries}`);
}

if (retryDelayMs < 10000) {
  fail(`Package Widget release smoke retry delay must be at least 10000ms, got ${retryDelayMs}`);
}

console.log(
  `${workflowPath} has a ${Math.round((retries * retryDelayMs) / 60000)} minute post-publish verification window`
);
