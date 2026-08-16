#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const ACTION_PINS = Object.freeze({
  'actions/checkout': 'fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09',
  'actions/setup-node': 'a0853c24544627f65ddf259abe73b1d18a591444',
  'actions/upload-artifact': '330a01c490aca151604b8cf639adc76d48f6c5d4',
  'actions/create-github-app-token': 'bcd2ba49218906704ab6c1aa796996da409d3eb1',
});

export function previewWorkflowErrors(liveSource, janitorSource, playwrightSource) {
  const errors = [];
  requireText(liveSource, errors, 'pull_request:', 'pull_request trigger');
  requireText(liveSource, errors, 'merge_group:', 'merge_group trigger');
  requireText(liveSource, errors, 'workflow_dispatch:', 'manual live trigger');
  forbidText(liveSource, errors, 'schedule:', 'schedule in candidate live workflow');
  forbidText(liveSource, errors, '  janitor:', 'janitor job in candidate live workflow');
  forbidText(
    liveSource,
    errors,
    'environment: preview-janitor',
    'janitor environment in live workflow'
  );
  forbidText(liveSource, errors, 'pull_request_target', 'pull_request_target');
  requireText(liveSource, errors, 'permissions: {}', 'live deny-by-default permissions');
  requireText(
    liveSource,
    errors,
    "environment: ${{ github.event_name == 'merge_group' && 'preview-merge-queue' || 'preview-pr' }}",
    'protected live environment split'
  );
  requireCount(liveSource, errors, 'group: bugdrop-board-shared-preview', 1, 'live preview mutex');
  requireCount(liveSource, errors, 'cancel-in-progress: false', 1, 'non-cancelling live mutex');
  requireText(
    liveSource,
    errors,
    '[ "$HEAD_REPOSITORY" = "$CURRENT_REPOSITORY" ]',
    'same-repository gate'
  );
  requireText(liveSource, errors, '[ "$ACTOR" != "dependabot[bot]" ]', 'Dependabot gate');
  requireText(liveSource, errors, 'permission-issues: write', 'repository-scoped Issue permission');
  requireText(
    liveSource,
    errors,
    'Run credential-free desktop and mobile browser proof',
    'credential-free browser step'
  );
  requireText(
    liveSource,
    errors,
    'Independently verify the one synthetic Issue',
    'independent verification'
  );
  requireText(liveSource, errors, 'if: always()', 'always cleanup');
  requireText(liveSource, errors, 'Final attributable prefix sweep', 'final sweep');
  requireText(liveSource, errors, 'Reset only the CI board after mutation', 'final D1 reset');
  requireText(liveSource, errors, 'name: Preview E2E', 'stable required check');
  requireText(playwrightSource, errors, "trace: 'off'", 'artifact redaction');

  requireText(janitorSource, errors, 'workflow_dispatch:', 'manual janitor trigger');
  requireText(janitorSource, errors, 'schedule:', 'scheduled janitor trigger');
  forbidText(janitorSource, errors, 'pull_request:', 'pull-request janitor trigger');
  forbidText(janitorSource, errors, 'pull_request_target', 'pull_request_target janitor trigger');
  forbidText(janitorSource, errors, 'merge_group:', 'merge-group janitor trigger');
  requireText(janitorSource, errors, 'permissions: {}', 'janitor deny-by-default permissions');
  requireText(janitorSource, errors, 'environment: preview-janitor', 'janitor-only environment');
  requireText(
    janitorSource,
    errors,
    "if: github.ref == format('refs/heads/{0}', github.event.repository.default_branch)",
    'default-branch dispatch guard'
  );
  requireText(janitorSource, errors, 'ref: ${{ github.sha }}', 'event-SHA checkout');
  requireText(janitorSource, errors, 'persist-credentials: false', 'credential-free checkout');
  requireCount(
    janitorSource,
    errors,
    'group: bugdrop-board-shared-preview',
    1,
    'shared janitor mutex'
  );
  requireCount(
    janitorSource,
    errors,
    'cancel-in-progress: false',
    1,
    'non-cancelling janitor mutex'
  );
  requireText(janitorSource, errors, 'permission-issues: write', 'monitor Issue permission');
  requireText(
    janitorSource,
    errors,
    'Sweep only attributable preview Issues',
    'attributable sweep'
  );

  errors.push(...actionPinErrors(`${liveSource}\n${janitorSource}`));
  errors.push(...janitorCandidateCodeErrors(janitorSource));
  errors.push(...janitorCredentialLeaks(janitorSource));
  return errors;
}

export function actionPinErrors(source) {
  const errors = [];
  const actions = [...source.matchAll(/^\s*(?:-\s*)?uses:\s*([^\s@]+)@([^\s#]+)/gm)];
  if (actions.length === 0) return ['No GitHub Actions found to pin'];
  for (const [, identity, revision] of actions) {
    const expected = ACTION_PINS[identity];
    if (!expected) errors.push(`Unapproved action identity: ${identity}`);
    else if (revision !== expected)
      errors.push(`Action ${identity} is not pinned to its verified commit`);
    if (!/^[a-f0-9]{40}$/.test(revision))
      errors.push(`Action ${identity} lacks a 40-character pin`);
  }
  return errors;
}

export function janitorCandidateCodeErrors(source) {
  const errors = [];
  const forbidden = [
    'github.event.pull_request',
    'github.head_ref',
    'github.event.merge_group',
    'refs/pull/',
    'npm ci',
    'npm install',
    'npx ',
  ];
  for (const value of forbidden) {
    if (source.includes(value))
      errors.push(`Janitor may execute candidate-controlled code via ${value}`);
  }
  return errors;
}

export function janitorCredentialLeaks(source) {
  const errors = [];
  const allowedSecrets = new Set([
    'BUGDROP_BOARD_PREVIEW_MONITOR_APP_ID',
    'BUGDROP_BOARD_PREVIEW_MONITOR_PRIVATE_KEY',
  ]);
  const referencedSecrets = [...source.matchAll(/secrets\.([A-Z0-9_]+)/g)].map(match => match[1]);
  for (const secret of referencedSecrets) {
    if (!allowedSecrets.has(secret)) errors.push(`Janitor references forbidden secret ${secret}`);
  }
  for (const required of allowedSecrets) {
    if (!referencedSecrets.includes(required))
      errors.push(`Janitor lacks monitor secret ${required}`);
  }
  const forbidden = [
    'CLOUDFLARE_API_TOKEN',
    'CLOUDFLARE_ACCOUNT_ID',
    'BUGDROP_BOARD_PREVIEW_RUNTIME_INSTALLATION_ID',
    'BOARD_GITHUB_APP_PRIVATE_KEY',
    'BOARD_TOKEN_PRIVATE_JWK',
    'BUGDROP_BOARD_VENUE_',
    'PLAYWRIGHT',
  ];
  for (const value of forbidden) {
    if (source.includes(value)) errors.push(`Janitor contains forbidden authority ${value}`);
  }
  return errors;
}

export function browserStepLeaksCredentials(source) {
  const start = source.indexOf('name: Run credential-free desktop and mobile browser proof');
  const end = source.indexOf('\n      - name:', start + 10);
  if (start < 0 || end < 0) return ['browser step cannot be isolated'];
  const step = source.slice(start, end);
  return [
    'MONITOR_TOKEN',
    'MONITOR_PRIVATE_KEY',
    'BOARD_GITHUB_APP_PRIVATE_KEY',
    'CLOUDFLARE_API_TOKEN',
    'BOARD_TOKEN_PRIVATE_JWK',
    'secrets.',
  ].filter(value => step.includes(value));
}

function requireText(source, errors, value, description) {
  if (!source.includes(value)) errors.push(`Missing ${description}`);
}

function forbidText(source, errors, value, description) {
  if (source.includes(value)) errors.push(`Forbidden ${description}`);
}

function requireCount(source, errors, value, minimum, description) {
  if (source.split(value).length - 1 < minimum) errors.push(`Missing ${description}`);
}

async function main() {
  const [liveWorkflow, janitorWorkflow, config] = await Promise.all([
    readFile('.github/workflows/preview-live.yml', 'utf8'),
    readFile('.github/workflows/preview-janitor.yml', 'utf8'),
    readFile('playwright.preview.config.ts', 'utf8'),
  ]);
  const errors = [
    ...previewWorkflowErrors(liveWorkflow, janitorWorkflow, config),
    ...browserStepLeaksCredentials(liveWorkflow),
  ];
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Preview workflows are fork-safe, trusted-janitor-only, and credential-separated');
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
