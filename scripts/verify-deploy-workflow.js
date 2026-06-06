#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import process from 'node:process';

const workflowPath = '.github/workflows/deploy.yml';
const workflow = readFileSync(workflowPath, 'utf8');

const required = [
  'name: Deploy Worker',
  'workflow_dispatch:',
  'wrangler_environment:',
  'smoke_cors_disallowed_origin:',
  'GITHUB_DEPLOY_ENVIRONMENT: ${{ inputs.environment }}',
  'SMOKE_CORS_DISALLOWED_ORIGIN: ${{ inputs.smoke_cors_disallowed_origin }}',
  'resolved_environment="$WRANGLER_ENVIRONMENT"',
  'resolved_environment="$GITHUB_DEPLOY_ENVIRONMENT"',
  'echo "WRANGLER_ENVIRONMENT=$resolved_environment" >> "$GITHUB_ENV"',
  'Production deploys must use wrangler_environment=production',
  'Production deploys require smoke_url',
  '--cors-disallowed-origin "$SMOKE_CORS_DISALLOWED_ORIGIN"',
  'rm -f .deploy.secrets',
];

const missing = required.filter(text => !workflow.includes(text));

if (missing.length > 0) {
  console.error(`Missing required deploy workflow text:\n${missing.join('\n')}`);
  process.exit(1);
}

console.log(`${workflowPath} matches the deploy workflow guardrail contract`);
