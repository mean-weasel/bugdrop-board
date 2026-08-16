import { describe, expect, it } from 'vitest';
import {
  canaryDescription,
  canaryTitle,
  closeMatchingIssues,
  runCli,
  verifyCanaryIssue,
} from '../scripts/github-issue-canary.mjs';
import { PREVIEW_CANARY_PROFILE } from '../scripts/github-issue-canary-profiles.mjs';

const sha = 'a'.repeat(40);
const venueCommit = 'b'.repeat(40);
const marker = `bugdrop-board-ci:123:2:${sha}`;
const author = 'bugdrop-board-preview-runtime[bot]';
const labels = ['enhancement'];
const itemId = 'item_fixture123';

function issue(overrides: Record<string, unknown> = {}) {
  const description = canaryDescription({
    marker,
    workerSha: sha,
    venueCommit,
    configVersion: 'venue-v1',
  });
  return {
    number: 41,
    title: canaryTitle(marker),
    body: `${description}\n\n---\nBugDrop Board item: \`${itemId}\`\nUpvotes are tracked in BugDrop Board, not GitHub reactions.`,
    state: 'open',
    html_url: 'https://github.com/mean-weasel/bugdrop-board-widget-test/issues/41',
    user: { login: author },
    labels: labels.map(name => ({ name })),
    ...overrides,
  };
}

function result() {
  return {
    schema: 'bugdrop-board-preview-result/v1',
    marker,
    itemId,
    issueNumber: 41,
    issueUrl: 'https://github.com/mean-weasel/bugdrop-board-widget-test/issues/41',
    workerSha: sha,
    widgetSha256: 'c'.repeat(64),
    venueCommit,
    configVersion: 'venue-v1',
  };
}

function options(fetchImpl: typeof fetch) {
  return {
    fetchImpl,
    token: 'monitor-secret',
    repo: PREVIEW_CANARY_PROFILE.repo,
    repositoryId: PREVIEW_CANARY_PROFILE.repositoryId,
    expectedAuthor: author,
    expectedLabels: labels,
    marker,
    expectedWorkerSha: sha,
    expectedVenueCommit: venueCommit,
    expectedConfigVersion: 'venue-v1',
    result: result(),
    attempts: 3,
    delayMs: 0,
    sleepImpl: async () => undefined,
  };
}

describe('preview GitHub Issue canary', () => {
  it('independently verifies repository, exact singleton, author, labels, body, and provenance', async () => {
    const fetchImpl = fixtureFetch({ issues: [issue()] });
    const verified = await verifyCanaryIssue(options(fetchImpl));
    expect(verified.number).toBe(41);
  });

  it('rejects duplicate marker matches', async () => {
    const fetchImpl = fixtureFetch({
      issues: [
        issue(),
        issue({
          number: 42,
          html_url: 'https://github.com/mean-weasel/bugdrop-board-widget-test/issues/42',
        }),
      ],
    });
    await expect(verifyCanaryIssue(options(fetchImpl))).rejects.toThrow('Expected one');
  });

  it('fails closed on the wrong repository node identity', async () => {
    const fetchImpl = fixtureFetch({ issues: [issue()], repositoryId: 'R_wrong' });
    await expect(verifyCanaryIssue(options(fetchImpl))).rejects.toThrow('repository identity');
  });

  it('will not attribute a wrong-author or invalid-marker Issue during a prefix sweep', async () => {
    const invalid = issue({
      number: 43,
      title: '[BugDrop Board CI canary] not-a-valid-marker',
      body: '<!-- bugdrop-board-canary: not-a-valid-marker -->',
    });
    const wrongAuthor = issue({ number: 44, user: { login: 'someone-else' } });
    const requests: Array<{ method: string; path: string }> = [];
    const fetchImpl = fixtureFetch({ issues: [issue(), invalid, wrongAuthor], requests });
    const cleaned = await closeMatchingIssues({
      ...options(fetchImpl),
      marker: undefined,
      prefix: PREVIEW_CANARY_PROFILE.titlePrefix,
    });
    expect(cleaned.closedNumbers).toEqual([41]);
    expect(requests.filter(request => request.method === 'PATCH')).toEqual([
      { method: 'PATCH', path: '/repos/mean-weasel/bugdrop-board-widget-test/issues/41' },
    ]);
  });

  it('reads back an ambiguous close, retries once, and requires two zero-open observations', async () => {
    const requests: Array<{ method: string; path: string }> = [];
    const fetchImpl = fixtureFetch({ issues: [issue()], requests, firstPatchFails: true });
    const cleaned = await closeMatchingIssues({ ...options(fetchImpl) });
    expect(cleaned.closedNumbers).toEqual([41]);
    expect(requests.filter(request => request.method === 'PATCH')).toHaveLength(1);
    expect(
      requests.filter(request => request.path.endsWith('/issues?state=open&per_page=100'))
    ).toHaveLength(2);
  });

  it('redacts the monitor credential from CLI errors', async () => {
    const errors: string[] = [];
    const exitCode = await runCli(
      [
        'sweep',
        '--repo',
        PREVIEW_CANARY_PROFILE.repo,
        '--repository-id',
        PREVIEW_CANARY_PROFILE.repositoryId,
        '--prefix',
        PREVIEW_CANARY_PROFILE.titlePrefix,
      ],
      {
        env: {
          BUGDROP_BOARD_PREVIEW_MONITOR_TOKEN: 'top-secret-token',
          BUGDROP_BOARD_PREVIEW_RUNTIME_BOT: author,
          BUGDROP_BOARD_PREVIEW_LABELS: JSON.stringify(labels),
          BUGDROP_BOARD_PREVIEW_REPOSITORY_ID: PREVIEW_CANARY_PROFILE.repositoryId,
        },
        fetchImpl: async () => new Response('top-secret-token leaked upstream', { status: 500 }),
        stderr: value => errors.push(value),
        attempts: 2,
        delayMs: 0,
        sleepImpl: async () => undefined,
      }
    );
    expect(exitCode).toBe(1);
    expect(errors.join('\n')).not.toContain('top-secret-token');
    expect(errors.join('\n')).toContain('[REDACTED]');
  });
});

function fixtureFetch({
  issues,
  repositoryId = PREVIEW_CANARY_PROFILE.repositoryId,
  requests = [],
  firstPatchFails = false,
}: {
  issues: Array<Record<string, unknown>>;
  repositoryId?: string;
  requests?: Array<{ method: string; path: string }>;
  firstPatchFails?: boolean;
}): typeof fetch {
  let patchAttempts = 0;
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    requests.push({ method, path: `${url.pathname}${url.search}` });
    if (url.pathname === '/repos/mean-weasel/bugdrop-board-widget-test' && !url.search) {
      return json({ node_id: repositoryId, full_name: PREVIEW_CANARY_PROFILE.repo });
    }
    const issueNumber = url.pathname.match(/\/issues\/(\d+)$/)?.[1];
    if (issueNumber && method === 'GET') {
      const found = issues.find(candidate => candidate.number === Number(issueNumber));
      return json(found ?? {}, found ? 200 : 404);
    }
    if (issueNumber && method === 'PATCH') {
      patchAttempts += 1;
      const found = issues.find(candidate => candidate.number === Number(issueNumber));
      if (found) found.state = 'closed';
      if (firstPatchFails && patchAttempts === 1) return json({ error: 'ambiguous' }, 502);
      return json(found ?? {});
    }
    if (url.pathname.endsWith('/issues')) {
      const state = url.searchParams.get('state');
      return json(issues.filter(candidate => state === 'all' || candidate.state === 'open'));
    }
    return json({ error: 'unexpected request' }, 404);
  }) as typeof fetch;
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
