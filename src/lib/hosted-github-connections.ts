import { createId } from './ids';

type HostedGitHubConnectionStatus = 'pending' | 'active' | 'suspended' | 'disabled';

export interface HostedGitHubConnectionConfig {
  id: string;
  installationId: string;
  accountLogin?: string;
  repoOwner: string;
  repoName: string;
  status: HostedGitHubConnectionStatus;
}

interface HostedGitHubConnectionRow {
  id: string;
  installation_id: string | null;
  account_login: string | null;
  repo_owner: string;
  repo_name: string;
  status: HostedGitHubConnectionStatus;
}

export async function createHostedGitHubConnection(
  db: D1Database,
  input: {
    id?: string;
    tenantId: string;
    appId: string;
    installationId: string;
    accountLogin?: string;
    repoOwner: string;
    repoName: string;
    status?: HostedGitHubConnectionStatus;
  }
): Promise<HostedGitHubConnectionConfig> {
  const connection = {
    id: input.id ?? createId('github_connection'),
    installationId: input.installationId,
    accountLogin: input.accountLogin,
    repoOwner: input.repoOwner,
    repoName: input.repoName,
    status: input.status ?? 'active',
  };

  await db
    .prepare(
      `INSERT INTO hosted_github_connections (
         id, tenant_id, app_id, installation_id, account_login, repo_owner, repo_name, status
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      connection.id,
      input.tenantId,
      input.appId,
      input.installationId,
      input.accountLogin ?? null,
      input.repoOwner,
      input.repoName,
      connection.status
    )
    .run();

  return connection;
}

export async function getActiveHostedGitHubConnection(
  db: D1Database,
  tenantId: string,
  appId: string,
  connectionId: string | null
): Promise<HostedGitHubConnectionConfig | undefined> {
  if (!connectionId) {
    return undefined;
  }

  const row = await db
    .prepare(
      `SELECT id, installation_id, account_login, repo_owner, repo_name, status
       FROM hosted_github_connections
       WHERE id = ?
         AND tenant_id = ?
         AND app_id = ?
         AND status = 'active'`
    )
    .bind(connectionId, tenantId, appId)
    .first<HostedGitHubConnectionRow>();
  if (!row?.installation_id) {
    return undefined;
  }

  return {
    id: row.id,
    installationId: row.installation_id,
    accountLogin: row.account_login ?? undefined,
    repoOwner: row.repo_owner,
    repoName: row.repo_name,
    status: row.status,
  };
}
