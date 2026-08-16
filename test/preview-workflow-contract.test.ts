import { describe, expect, it } from 'vitest';
import {
  ACTION_PINS,
  actionPinErrors,
  browserStepLeaksCredentials,
  janitorCandidateCodeErrors,
  janitorCredentialLeaks,
  previewWorkflowErrors,
} from '../scripts/preview-workflow-contract.mjs';
// @ts-expect-error Vite provides raw text imports to the bundled Worker test runtime.
import liveWorkflow from '../.github/workflows/preview-live.yml?raw';
// @ts-expect-error Vite provides raw text imports to the bundled Worker test runtime.
import janitorWorkflow from '../.github/workflows/preview-janitor.yml?raw';
// @ts-expect-error Vite provides raw text imports to the bundled Worker test runtime.
import playwright from '../playwright.preview.config.ts?raw';
// @ts-expect-error Vite provides raw text imports to the bundled Worker test runtime.
import canary from '../scripts/github-issue-canary.mjs?raw';
// @ts-expect-error Vite provides raw text imports to the bundled Worker test runtime.
import profiles from '../scripts/github-issue-canary-profiles.mjs?raw';

describe('preview workflow trust and cleanup contract', () => {
  it('keeps candidate and trusted-janitor triggers, environments, mutexes, and cleanup separate', () => {
    expect(previewWorkflowErrors(liveWorkflow, janitorWorkflow, playwright)).toEqual([]);
    expect(liveWorkflow).not.toContain('schedule:');
    expect(liveWorkflow).not.toContain('environment: preview-janitor');
    expect(janitorWorkflow).not.toContain('pull_request:');
    expect(janitorWorkflow).not.toContain('merge_group:');
  });

  it('does not expose deployment, runtime, signer, or monitor credentials to Playwright', () => {
    expect(browserStepLeaksCredentials(liveWorkflow)).toEqual([]);
  });

  it('runs janitor code only from a guarded default-branch event SHA', () => {
    expect(janitorCandidateCodeErrors(janitorWorkflow)).toEqual([]);
    expect(janitorWorkflow).toContain(
      "if: github.ref == format('refs/heads/{0}', github.event.repository.default_branch)"
    );
    expect(janitorWorkflow).toContain('ref: ${{ github.sha }}');
    expect(janitorWorkflow).toContain('persist-credentials: false');

    const candidateCheckout = janitorWorkflow.replace(
      'ref: ${{ github.sha }}',
      'ref: ${{ github.event.pull_request.head.sha }}'
    );
    expect(previewWorkflowErrors(liveWorkflow, candidateCheckout, playwright)).not.toEqual([]);

    const unguarded = janitorWorkflow.replace(
      "if: github.ref == format('refs/heads/{0}', github.event.repository.default_branch)",
      'if: always()'
    );
    expect(previewWorkflowErrors(liveWorkflow, unguarded, playwright)).not.toEqual([]);
  });

  it('gives the janitor only the two monitor-App secrets', () => {
    expect(janitorCredentialLeaks(janitorWorkflow)).toEqual([]);
    const cloudflareLeak = `${janitorWorkflow}\n          CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}`;
    expect(janitorCredentialLeaks(cloudflareLeak)).toContain(
      'Janitor references forbidden secret CLOUDFLARE_API_TOKEN'
    );
    expect(janitorCredentialLeaks(cloudflareLeak)).toContain(
      'Janitor contains forbidden authority CLOUDFLARE_API_TOKEN'
    );
  });

  it('pins every action in both workflows to the reviewed immutable commit', () => {
    expect(actionPinErrors(`${liveWorkflow}\n${janitorWorkflow}`)).toEqual([]);
    for (const [identity, commit] of Object.entries(ACTION_PINS)) {
      expect(commit).toMatch(/^[a-f0-9]{40}$/);
      expect(`${liveWorkflow}\n${janitorWorkflow}`).toContain(`${identity}@${commit}`);
    }
    expect(
      actionPinErrors(liveWorkflow.replace(ACTION_PINS['actions/checkout'], 'v5'))
    ).not.toEqual([]);
  });

  it('does not use pull_request_target and sends forks through only the fork-safe path', () => {
    expect(liveWorkflow).not.toContain('pull_request_target');
    expect(liveWorkflow).toContain("if: needs.classify.outputs.trusted != 'true'");
    expect(liveWorkflow).toContain("if: needs.classify.outputs.trusted == 'true'");
    expect(liveWorkflow).toContain('[ "$HEAD_REPOSITORY" = "$CURRENT_REPOSITORY" ]');
    expect(liveWorkflow).toContain('[ "$ACTOR" != "dependabot[bot]" ]');
  });

  it('binds cleanup to the exact repository identity, bot, prefix, and valid marker implementation', () => {
    expect(canary).toContain('assertRepositoryIdentity');
    expect(canary).toContain('sameLogin(issue.user?.login, expectedAuthor)');
    expect(canary).toContain('markerFromIssue(issue)');
    expect(profiles).toContain("repositoryId: 'R_kgDOT5iiFg'");
    expect(profiles).toContain("titlePrefix: '[BugDrop Board CI canary]'");
  });
});
