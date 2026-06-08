import { buildUpsertSql } from './provision-board-core.js';

export function buildHostedSql(options, board) {
  const ids = hostedIds(options, board);
  return {
    ids,
    sql: [
      upsertTenantSql(ids, options),
      upsertAppSql(ids, options),
      buildUpsertSql(board),
      ...options.origins.map((origin, index) => upsertOriginSql(ids, origin, index)),
      upsertVerifierSql(ids, options),
      upsertGitHubConnectionSql(ids, options, board),
      upsertBoardConfigSql(ids, board),
    ].join('\n\n'),
  };
}

function hostedIds(options, board) {
  const tenantPart = idPart(options.tenantSlug);
  const appPart = idPart(`${options.tenantSlug}_${options.appSlug}`);
  return {
    tenantId: `tenant_${tenantPart}`,
    appId: `app_${appPart}`,
    verifierId: `verifier_${appPart}_default`,
    githubConnectionId: `github_connection_${appPart}_${idPart(board.repoOwner)}_${idPart(board.repoName)}`,
    boardConfigId: `board_config_${idPart(board.id)}`,
  };
}

function upsertTenantSql(ids, options) {
  return `INSERT INTO hosted_tenants (id, name, slug, status)
VALUES (${sql(ids.tenantId)}, ${sql(options.tenantName)}, ${sql(options.tenantSlug)}, 'active')
ON CONFLICT(slug) DO UPDATE SET
  name = excluded.name,
  status = 'active',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');`;
}

function upsertAppSql(ids, options) {
  return `INSERT INTO hosted_apps (id, tenant_id, name, slug, status)
VALUES (${sql(ids.appId)}, ${sql(ids.tenantId)}, ${sql(options.appName)}, ${sql(options.appSlug)}, 'active')
ON CONFLICT(tenant_id, slug) DO UPDATE SET
  name = excluded.name,
  status = 'active',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');`;
}

function upsertOriginSql(ids, origin, index) {
  const originId = `origin_${idPart(ids.appId)}_${index + 1}`;
  return `INSERT INTO hosted_app_origins (id, tenant_id, app_id, origin, status)
VALUES (${sql(originId)}, ${sql(ids.tenantId)}, ${sql(ids.appId)}, ${sql(origin)}, 'active')
ON CONFLICT(app_id, origin) DO UPDATE SET
  status = 'active',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');`;
}

function upsertVerifierSql(ids, options) {
  return `INSERT INTO hosted_app_token_verifiers (
  id, tenant_id, app_id, verifier_type, issuer, audience, jwks_url, public_key_pem,
  key_id, secret_ref, max_ttl_seconds, status, is_default
)
VALUES (
  ${sql(ids.verifierId)}, ${sql(ids.tenantId)}, ${sql(ids.appId)}, 'jwks',
  ${sql(options.issuer)}, ${sql(options.audience)}, ${sql(options.jwksUrl)}, NULL,
  ${nullableSql(options.keyId)}, NULL, ${options.maxTtlSeconds ?? 300}, 'active', 1
)
ON CONFLICT(id) DO UPDATE SET
  issuer = excluded.issuer,
  audience = excluded.audience,
  jwks_url = excluded.jwks_url,
  key_id = excluded.key_id,
  max_ttl_seconds = excluded.max_ttl_seconds,
  status = 'active',
  is_default = 1,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');`;
}

function upsertGitHubConnectionSql(ids, options, board) {
  return `INSERT INTO hosted_github_connections (
  id, tenant_id, app_id, installation_id, account_login, repo_owner, repo_name, status
)
VALUES (
  ${sql(ids.githubConnectionId)}, ${sql(ids.tenantId)}, ${sql(ids.appId)},
  ${sql(options.githubInstallationId)}, ${nullableSql(options.githubAccountLogin)},
  ${sql(board.repoOwner)}, ${sql(board.repoName)}, 'active'
)
ON CONFLICT(id) DO UPDATE SET
  installation_id = excluded.installation_id,
  account_login = excluded.account_login,
  repo_owner = excluded.repo_owner,
  repo_name = excluded.repo_name,
  status = 'active',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');`;
}

function upsertBoardConfigSql(ids, board) {
  return `INSERT INTO hosted_board_configs (
  id, tenant_id, app_id, board_id, github_connection_id, status
)
VALUES (
  ${sql(ids.boardConfigId)}, ${sql(ids.tenantId)}, ${sql(ids.appId)},
  ${sql(board.id)}, ${sql(ids.githubConnectionId)}, 'active'
)
ON CONFLICT(board_id) DO UPDATE SET
  tenant_id = excluded.tenant_id,
  app_id = excluded.app_id,
  github_connection_id = excluded.github_connection_id,
  status = 'active',
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');`;
}

function nullableSql(item) {
  return item ? sql(item) : 'NULL';
}

function sql(item) {
  return `'${String(item).replaceAll("'", "''")}'`;
}

function idPart(value) {
  return String(value).replace(/[^A-Za-z0-9_]/g, '_');
}
