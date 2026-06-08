import { describe, expect, it } from 'vitest';
import {
  buildHostedProvisioningPlan,
  parseHostedArgs,
  redactHostedSetupOutput,
} from '../scripts/provision-hosted-board-core.js';

const REQUIRED_ARGS = [
  '--tenant-slug',
  'mean-weasel',
  '--tenant-name',
  'Mean Weasel',
  '--app-slug',
  'dogfood',
  '--app-name',
  'Dogfood App',
  '--repo',
  'mean-weasel/demo',
  '--origin',
  'https://bugdrop.dev',
  '--origin',
  'https://board.bugdrop.dev',
  '--issuer',
  'https://bugdrop.dev',
  '--audience',
  'bugdrop-board',
  '--jwks-url',
  'https://bugdrop.dev/.well-known/jwks.json',
  '--github-installation-id',
  '123456',
  '--github-account-login',
  'mean-weasel',
  '--api-url',
  'https://board.bugdrop.dev',
  '--token-endpoint',
  '/api/bugdrop-board-token',
  '--layout',
  'kanban',
  '--density',
  'compact',
  '--color',
  '#0f766e',
  '--config-selector',
  '#bugdrop-board-config',
];

describe('provision-hosted-board helpers', () => {
  it('parses hosted provisioning inputs with repeated origins and remote env mode', () => {
    expect(parseHostedArgs([...REQUIRED_ARGS, '--remote', '--env', 'production'])).toMatchObject({
      tenantSlug: 'mean-weasel',
      tenantName: 'Mean Weasel',
      appSlug: 'dogfood',
      appName: 'Dogfood App',
      repo: 'mean-weasel/demo',
      origins: ['https://bugdrop.dev', 'https://board.bugdrop.dev'],
      issuer: 'https://bugdrop.dev',
      audience: 'bugdrop-board',
      jwksUrl: 'https://bugdrop.dev/.well-known/jwks.json',
      githubInstallationId: '123456',
      githubAccountLogin: 'mean-weasel',
      apiUrl: 'https://board.bugdrop.dev',
      tokenEndpoint: '/api/bugdrop-board-token',
      layout: 'kanban',
      density: 'compact',
      color: '#0f766e',
      configSelector: '#bugdrop-board-config',
      local: false,
      env: 'production',
    });
  });

  it('builds hosted setup SQL for tenant, app, board, origins, verifier, GitHub connection, and board config', () => {
    const plan = buildHostedProvisioningPlan(
      parseHostedArgs([...REQUIRED_ARGS, '--board-name', "Ada's Requests"])
    );

    expect(plan.board).toMatchObject({
      id: 'board_mean_weasel_demo',
      repoOwner: 'mean-weasel',
      repoName: 'demo',
      name: "Ada's Requests",
    });
    expect(plan.sql).toContain('INSERT INTO hosted_tenants');
    expect(plan.sql).toContain('INSERT INTO hosted_apps');
    expect(plan.sql).toContain('INSERT INTO boards');
    expect(plan.sql).toContain('INSERT INTO hosted_app_origins');
    expect(plan.sql).toContain('https://bugdrop.dev');
    expect(plan.sql).toContain('https://board.bugdrop.dev');
    expect(plan.sql).toContain('INSERT INTO hosted_app_token_verifiers');
    expect(plan.sql).toContain('INSERT INTO hosted_github_connections');
    expect(plan.sql).toContain('INSERT INTO hosted_board_configs');
    expect(plan.sql).toContain("'Ada''s Requests'");
  });

  it('generates a hosted embed snippet and security checklist handoff', () => {
    const plan = buildHostedProvisioningPlan(parseHostedArgs(REQUIRED_ARGS));

    expect(plan.handoff.embedSnippet).toContain('src="https://board.bugdrop.dev/board.js"');
    expect(plan.handoff.embedSnippet).toContain('data-board-id="board_mean_weasel_demo"');
    expect(plan.handoff.embedSnippet).toContain('data-api-url="https://board.bugdrop.dev"');
    expect(plan.handoff.embedSnippet).toContain('data-token-endpoint="/api/bugdrop-board-token"');
    expect(plan.handoff.embedSnippet).toContain('data-layout="kanban"');
    expect(plan.handoff.embedSnippet).toContain('data-density="compact"');
    expect(plan.handoff.embedSnippet).toContain('data-color="#0f766e"');
    expect(plan.handoff.embedSnippet).toContain('data-config-selector="#bugdrop-board-config"');
    expect(plan.handoff.securityChecklist).toEqual(
      expect.arrayContaining([
        expect.stringContaining('allowed origin'),
        expect.stringContaining('issuer'),
        expect.stringContaining('audience'),
        expect.stringContaining('GitHub installation'),
      ])
    );
  });

  it('redacts secret and token material from setup output', () => {
    const redacted = redactHostedSetupOutput({
      githubInstallationToken: 'ghs_installation_secret',
      privateKeyPem: '-----BEGIN PRIVATE KEY-----\nsecret\n-----END PRIVATE KEY-----',
      hmacSecret: 'super-secret',
      nested: { bearerToken: 'Bearer abc123' },
      safe: 'visible',
    });
    const serialized = JSON.stringify(redacted);

    expect(redacted).toMatchObject({
      githubInstallationToken: '[redacted]',
      privateKeyPem: '[redacted]',
      hmacSecret: '[redacted]',
      nested: { bearerToken: '[redacted]' },
      safe: 'visible',
    });
    expect(serialized).not.toContain('ghs_installation_secret');
    expect(serialized).not.toContain('BEGIN PRIVATE KEY');
    expect(serialized).not.toContain('super-secret');
    expect(serialized).not.toContain('Bearer abc123');
  });
});
