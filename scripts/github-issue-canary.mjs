#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import {
  PREVIEW_CANARY_PROFILE,
  canonicalIssueUrl,
  markerFromIssue,
  validateCanarySelector,
} from './github-issue-canary-profiles.mjs';

const API = 'https://api.github.com';
const ATTEMPTS = 6;
const DELAY_MS = 2_000;

export function canaryTitle(marker) {
  validateCanarySelector({
    ...fixedSelector(),
    marker,
  });
  return `${PREVIEW_CANARY_PROFILE.titlePrefix} ${marker}`;
}

export function canaryDescription({ marker, workerSha, venueCommit, configVersion }) {
  validateCanarySelector({ ...fixedSelector(), marker, expectedWorkerSha: workerSha });
  requireSha(venueCommit, 'venue commit');
  requireNonempty(configVersion, 'config version');
  return [
    'Synthetic preview verification only. This Issue is closed automatically.',
    '',
    `<!-- bugdrop-board-canary: ${marker} -->`,
    `Worker SHA: \`${workerSha}\``,
    `Venue commit: \`${venueCommit}\``,
    `Venue config: \`${configVersion}\``,
  ].join('\n');
}

export async function verifyCanaryIssue(options) {
  const selector = validatedOptions(options, { marker: options.marker });
  requireSha(options.expectedWorkerSha, 'expected Worker SHA');
  requireSha(options.expectedVenueCommit, 'expected venue commit');
  requireNonempty(options.expectedConfigVersion, 'expected config version');
  validateBrowserResultReference(options);
  await assertRepositoryIdentity(options);

  const candidate = await getIssue(options, options.result.issueNumber);
  const matches = await stableMatches(options, selector, 'all');
  if (matches.length !== 1 || matches[0].number !== candidate.number) {
    throw new Error(`Expected one attributable Issue for marker; found ${numbers(matches)}`);
  }

  const failures = [];
  const expectedDescription = canaryDescription({
    marker: options.marker,
    workerSha: options.expectedWorkerSha,
    venueCommit: options.expectedVenueCommit,
    configVersion: options.expectedConfigVersion,
  });
  const expectedBody = `${expectedDescription}\n\n---\nBugDrop Board item: \`${options.result.itemId}\`\nUpvotes are tracked in BugDrop Board, not GitHub reactions.`;
  if (candidate.title !== canaryTitle(options.marker)) failures.push('title mismatch');
  if (candidate.body !== expectedBody) failures.push('body or provenance mismatch');
  if (candidate.state !== 'open') failures.push('Issue is not open');
  if (!sameLogin(candidate.user?.login, options.expectedAuthor)) failures.push('author mismatch');
  if (!sameSet(labels(candidate), options.expectedLabels)) failures.push('labels mismatch');
  if (!canonicalIssueUrl(candidate.html_url, candidate.number)) failures.push('non-canonical URL');
  if (candidate.html_url !== options.result.issueUrl) failures.push('browser URL mismatch');
  if (candidate.number !== options.result.issueNumber) failures.push('browser number mismatch');
  if (failures.length) throw new Error(`Canary Issue failed verification: ${failures.join('; ')}`);
  return candidate;
}

export async function closeMatchingIssues(options) {
  const selector = validatedOptions(options, {
    marker: options.marker,
    prefix: options.prefix,
  });
  await assertRepositoryIdentity(options);
  const initial = await initialMatches(options, selector);
  if (selector.marker && initial.length === 0) {
    throw new Error('No attributable Issue appeared for the exact marker');
  }

  const closedNumbers = [];
  for (const issue of initial.filter(candidate => candidate.state === 'open')) {
    await closeWithReadback(options, issue.number);
    closedNumbers.push(issue.number);
  }
  const remaining = await twoZeroObservations(options, selector);
  if (remaining.length) throw new Error(`Cleanup left open Issues: ${numbers(remaining)}`);
  return { matchedNumbers: initial.map(issue => issue.number), closedNumbers, openNumbers: [] };
}

export async function runCli(argv, dependencies = {}) {
  const env = dependencies.env ?? process.env;
  const stdout = dependencies.stdout ?? (value => process.stdout.write(`${value}\n`));
  const stderr = dependencies.stderr ?? (value => process.stderr.write(`${value}\n`));
  const token = env.BUGDROP_BOARD_PREVIEW_MONITOR_TOKEN;
  try {
    requireNonempty(token, 'BUGDROP_BOARD_PREVIEW_MONITOR_TOKEN');
    const { command, options } = parseArgs(argv);
    const common = {
      ...options,
      token,
      expectedAuthor: env.BUGDROP_BOARD_PREVIEW_RUNTIME_BOT,
      repositoryId: env.BUGDROP_BOARD_PREVIEW_REPOSITORY_ID,
      expectedLabels: parseLabels(env.BUGDROP_BOARD_PREVIEW_LABELS),
      fetchImpl: dependencies.fetchImpl,
      readFileImpl: dependencies.readFileImpl,
      sleepImpl: dependencies.sleepImpl,
      attempts: dependencies.attempts,
      delayMs: dependencies.delayMs,
    };
    let output;
    if (command === 'verify') {
      requireNonempty(options.resultFile, '--result-file');
      const reader = dependencies.readFileImpl ?? readFile;
      const result = JSON.parse(await reader(options.resultFile, 'utf8'));
      output = await verifyCanaryIssue({ ...common, result });
      output = { verified: true, issueNumber: output.number, issueUrl: output.html_url };
    } else if (command === 'cleanup' || command === 'preflight' || command === 'sweep') {
      output = await closeMatchingIssues(common);
    } else {
      throw new Error(`Unknown command: ${command || '(missing)'}`);
    }
    stdout(JSON.stringify(output));
    return 0;
  } catch (error) {
    stderr(`[bugdrop-board-canary] ${redact(message(error), token)}`);
    return 1;
  }
}

function validatedOptions(options, selectors) {
  const required = {
    repo: options.repo,
    repositoryId: options.repositoryId,
    expectedAuthor: options.expectedAuthor,
    ...selectors,
    expectedWorkerSha: options.expectedWorkerSha,
  };
  return validateCanarySelector(required);
}

function fixedSelector() {
  return {
    repo: PREVIEW_CANARY_PROFILE.repo,
    repositoryId: PREVIEW_CANARY_PROFILE.repositoryId,
    expectedAuthor: 'placeholder[bot]',
  };
}

function validateBrowserResultReference(options) {
  const result = options.result;
  if (!result || typeof result !== 'object') throw new Error('Browser result is invalid');
  if (result.schema !== 'bugdrop-board-preview-result/v1')
    throw new Error('Result schema mismatch');
  if (result.marker !== options.marker) throw new Error('Result marker mismatch');
  if (result.workerSha !== options.expectedWorkerSha) throw new Error('Result Worker SHA mismatch');
  if (result.venueCommit !== options.expectedVenueCommit) throw new Error('Venue commit mismatch');
  if (result.configVersion !== options.expectedConfigVersion) throw new Error('Config mismatch');
  if (!/^item_[A-Za-z0-9_-]+$/.test(result.itemId ?? '')) throw new Error('Item ID invalid');
  if (!Number.isInteger(result.issueNumber) || result.issueNumber <= 0) {
    throw new Error('Issue number invalid');
  }
  if (!canonicalIssueUrl(result.issueUrl, result.issueNumber)) throw new Error('Issue URL invalid');
}

async function assertRepositoryIdentity(options) {
  const data = await requestJson(options, `/repos/${PREVIEW_CANARY_PROFILE.repo}`);
  if (data.node_id !== options.repositoryId || data.full_name !== PREVIEW_CANARY_PROFILE.repo) {
    throw new Error('GitHub repository identity mismatch');
  }
}

async function matchingIssues(options, selector, state) {
  const issues = await listRepositoryIssues(
    options,
    `/repos/${PREVIEW_CANARY_PROFILE.repo}/issues?state=${state}&per_page=100`
  );
  return issues.filter(issue => attributable(issue, selector, options.expectedAuthor));
}

async function listRepositoryIssues(options, initialPath) {
  const issues = [];
  let next = initialPath;
  while (next) {
    const { data, response } = await requestJsonResponse(options, next);
    if (!Array.isArray(data)) throw new Error('GitHub Issues response is not an array');
    issues.push(...data);
    next = nextLink(response.headers.get('link'));
  }
  return issues;
}

function attributable(issue, selector, expectedAuthor) {
  if (issue.pull_request || !sameLogin(issue.user?.login, expectedAuthor)) return false;
  const marker = markerFromIssue(issue);
  if (!marker || issue.title !== canaryTitle(marker)) return false;
  if (selector.marker && marker !== selector.marker) return false;
  if (selector.prefix && !issue.title.startsWith(`${selector.prefix} `)) return false;
  return issue.body?.includes(`<!-- bugdrop-board-canary: ${marker} -->`) === true;
}

async function stableMatches(options, selector, state) {
  let prior = '';
  let matches = [];
  for (let attempt = 0; attempt < attempts(options); attempt += 1) {
    matches = await matchingIssues(options, selector, state);
    const current = numbers(matches);
    if (matches.length > 1 || (matches.length === 1 && current === prior)) return matches;
    prior = current;
    await pause(options, attempt);
  }
  throw new Error('Exactly-one Issue observation did not stabilize');
}

async function initialMatches(options, selector) {
  for (let attempt = 0; attempt < attempts(options); attempt += 1) {
    const matches = await matchingIssues(options, selector, selector.marker ? 'all' : 'open');
    if (matches.length || selector.prefix) return matches;
    await pause(options, attempt);
  }
  return [];
}

async function twoZeroObservations(options, selector) {
  let zeroes = 0;
  let matches = [];
  for (let attempt = 0; attempt < attempts(options); attempt += 1) {
    matches = await matchingIssues(options, selector, 'open');
    zeroes = matches.length === 0 ? zeroes + 1 : 0;
    if (zeroes === 2) return [];
    await pause(options, attempt);
  }
  return matches;
}

async function closeWithReadback(options, number) {
  for (let write = 0; write < 2; write += 1) {
    let writeError;
    try {
      await requestJson(options, `/repos/${PREVIEW_CANARY_PROFILE.repo}/issues/${number}`, {
        method: 'PATCH',
        body: { state: 'closed', state_reason: 'not_planned' },
      });
    } catch (error) {
      writeError = error;
    }
    const issue = await getIssue(options, number);
    if (issue.state === 'closed') return;
    if (write === 1) throw writeError ?? new Error(`Issue #${number} remained open`);
  }
}

async function getIssue(options, number) {
  if (!Number.isInteger(number) || number <= 0) throw new Error('Invalid Issue number');
  return requestJson(options, `/repos/${PREVIEW_CANARY_PROFILE.repo}/issues/${number}`);
}

async function requestJson(options, path, init = {}) {
  return (await requestJsonResponse(options, path, init)).data;
}

async function requestJsonResponse(options, path, init = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = new URL(path, options.apiBaseUrl ?? API);
  let response;
  try {
    response = await fetchImpl(url, {
      method: init.method ?? 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${options.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    });
  } catch (error) {
    throw new Error(`GitHub API request failed: ${redact(message(error), options.token)}`);
  }
  const text = await response.text();
  if (!response.ok) {
    const rate = response.status === 429 || response.headers.get('x-ratelimit-remaining') === '0';
    throw new Error(
      `${rate ? 'GitHub rate limit exhausted' : 'GitHub API failed'} (${response.status}): ${redact(text.slice(0, 300), options.token)}`
    );
  }
  try {
    return { data: text ? JSON.parse(text) : null, response };
  } catch {
    throw new Error('GitHub API returned invalid JSON');
  }
}

function nextLink(value) {
  if (!value) return '';
  for (const segment of value.split(',')) {
    const match = segment.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match?.[2].split(/\s+/).includes('next')) return match[1];
  }
  return '';
}

function parseArgs(argv) {
  const command = argv[0] ?? '';
  const options = {};
  const flags = {
    '--repo': 'repo',
    '--repository-id': 'repositoryId',
    '--marker': 'marker',
    '--prefix': 'prefix',
    '--result-file': 'resultFile',
    '--expected-worker-sha': 'expectedWorkerSha',
    '--expected-venue-commit': 'expectedVenueCommit',
    '--expected-config-version': 'expectedConfigVersion',
  };
  for (let index = 1; index < argv.length; index += 2) {
    const name = flags[argv[index]];
    const value = argv[index + 1];
    if (!name || !value || value.startsWith('--')) throw new Error(`Invalid option ${argv[index]}`);
    options[name] = value;
  }
  return { command, options };
}

function parseLabels(value) {
  let labelsValue;
  try {
    labelsValue = JSON.parse(value ?? '');
  } catch {
    throw new Error('BUGDROP_BOARD_PREVIEW_LABELS must be valid JSON');
  }
  if (
    !Array.isArray(labelsValue) ||
    labelsValue.some(label => !label || typeof label !== 'string')
  ) {
    throw new Error('BUGDROP_BOARD_PREVIEW_LABELS must be a string array');
  }
  return labelsValue;
}

function labels(issue) {
  return (issue.labels ?? []).map(label => (typeof label === 'string' ? label : label.name));
}

function sameSet(left, right) {
  return [...left].sort().join('\n') === [...right].sort().join('\n');
}

function sameLogin(left, right) {
  return (
    typeof left === 'string' &&
    typeof right === 'string' &&
    left.toLowerCase() === right.toLowerCase()
  );
}

function attempts(options) {
  const value = options.attempts ?? ATTEMPTS;
  if (!Number.isInteger(value) || value < 2 || value > 20) throw new Error('attempts must be 2-20');
  return value;
}

async function pause(options, attempt) {
  if (attempt + 1 >= attempts(options)) return;
  const delay = options.delayMs ?? DELAY_MS;
  if (!Number.isInteger(delay) || delay < 0 || delay > 10_000) throw new Error('invalid delay');
  await (options.sleepImpl ?? (ms => new Promise(resolve => setTimeout(resolve, ms))))(delay);
}

function numbers(issues) {
  return issues.length ? issues.map(issue => `#${issue.number}`).join(', ') : 'none';
}

function requireNonempty(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required`);
}

function requireSha(value, field) {
  if (!/^[a-f0-9]{40}$/.test(value ?? '')) throw new Error(`${field} must be a full lowercase SHA`);
}

function message(error) {
  return error instanceof Error ? error.message : String(error);
}

function redact(value, secret) {
  return secret ? value.split(secret).join('[REDACTED]') : value;
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) process.exitCode = await runCli(process.argv.slice(2));
