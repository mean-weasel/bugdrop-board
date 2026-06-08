import { createId } from './ids';
import {
  createHostedGitHubConnection,
  getActiveHostedGitHubConnection,
  type HostedGitHubConnectionConfig,
} from './hosted-github-connections';
import {
  mapTokenVerifier,
  type HostedTokenVerifierConfig,
  type HostedTokenVerifierStatus,
  type HostedTokenVerifierType,
  type HostedVerifierRow,
} from './hosted-token-verifier-config';

type HostedStatus = 'active' | 'paused' | 'disabled';
type HostedOriginStatus = 'active' | 'disabled';

export interface HostedBoardConfig {
  id: string;
  tenantId: string;
  appId: string;
  boardId: string;
  status: HostedStatus;
  activeOrigins: string[];
  tokenVerifier?: HostedTokenVerifierConfig;
  githubConnection?: HostedGitHubConnectionConfig;
}

interface HostedBoardConfigRow {
  id: string;
  tenant_id: string;
  app_id: string;
  board_id: string;
  github_connection_id: string | null;
  status: HostedStatus;
}

interface HostedOriginRow {
  origin: string;
}

export class HostedConfigRepository {
  constructor(private readonly db: D1Database) {}

  async createTenant(input: { id?: string; name: string; slug: string; status?: HostedStatus }) {
    const id = input.id ?? createId('tenant');
    await this.db
      .prepare(
        `INSERT INTO hosted_tenants (id, name, slug, status)
         VALUES (?, ?, ?, ?)`
      )
      .bind(id, input.name, input.slug, input.status ?? 'active')
      .run();
    return { id, name: input.name, slug: input.slug, status: input.status ?? 'active' };
  }

  async createApp(input: {
    id?: string;
    tenantId: string;
    name: string;
    slug: string;
    status?: HostedStatus;
  }) {
    const id = input.id ?? createId('app');
    await this.db
      .prepare(
        `INSERT INTO hosted_apps (id, tenant_id, name, slug, status)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(id, input.tenantId, input.name, input.slug, input.status ?? 'active')
      .run();
    return {
      id,
      tenantId: input.tenantId,
      name: input.name,
      slug: input.slug,
      status: input.status ?? 'active',
    };
  }

  async addOrigin(input: {
    id?: string;
    tenantId: string;
    appId: string;
    origin: string;
    status?: HostedOriginStatus;
  }) {
    const id = input.id ?? createId('origin');
    await this.db
      .prepare(
        `INSERT INTO hosted_app_origins (id, tenant_id, app_id, origin, status)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(id, input.tenantId, input.appId, input.origin, input.status ?? 'active')
      .run();
    return {
      id,
      tenantId: input.tenantId,
      appId: input.appId,
      origin: input.origin,
      status: input.status ?? 'active',
    };
  }

  async createTokenVerifier(input: {
    id?: string;
    tenantId: string;
    appId: string;
    type: HostedTokenVerifierType;
    issuer: string;
    audience: string;
    jwksUrl?: string;
    publicKeyPem?: string;
    keyId?: string;
    secretRef?: string;
    maxTtlSeconds?: number;
    status?: HostedTokenVerifierStatus;
    isDefault?: boolean;
  }): Promise<HostedTokenVerifierConfig> {
    const id = input.id ?? createId('verifier');
    const verifier = {
      id,
      type: input.type,
      issuer: input.issuer,
      audience: input.audience,
      jwksUrl: input.jwksUrl,
      publicKeyPem: input.publicKeyPem,
      keyId: input.keyId,
      secretRef: input.secretRef,
      maxTtlSeconds: input.maxTtlSeconds ?? 300,
      status: input.status ?? 'active',
      isDefault: input.isDefault ?? input.type === 'jwks',
    };

    await this.db
      .prepare(
        `INSERT INTO hosted_app_token_verifiers (
           id, tenant_id, app_id, verifier_type, issuer, audience, jwks_url, public_key_pem,
           key_id, secret_ref, max_ttl_seconds, status, is_default
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        input.tenantId,
        input.appId,
        input.type,
        input.issuer,
        input.audience,
        input.jwksUrl ?? null,
        input.publicKeyPem ?? null,
        input.keyId ?? null,
        input.secretRef ?? null,
        verifier.maxTtlSeconds,
        verifier.status,
        verifier.isDefault ? 1 : 0
      )
      .run();

    return verifier;
  }

  async createGitHubConnection(input: {
    id?: string;
    tenantId: string;
    appId: string;
    installationId: string;
    accountLogin?: string;
    repoOwner: string;
    repoName: string;
    status?: HostedGitHubConnectionConfig['status'];
  }): Promise<HostedGitHubConnectionConfig> {
    return createHostedGitHubConnection(this.db, input);
  }

  async configureBoard(input: {
    id?: string;
    tenantId: string;
    appId: string;
    boardId: string;
    githubConnectionId?: string;
    status?: HostedStatus;
  }) {
    const id = input.id ?? createId('board_config');
    await this.db
      .prepare(
        `INSERT INTO hosted_board_configs (
           id, tenant_id, app_id, board_id, github_connection_id, status
         )
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        input.tenantId,
        input.appId,
        input.boardId,
        input.githubConnectionId ?? null,
        input.status ?? 'active'
      )
      .run();
    return {
      id,
      tenantId: input.tenantId,
      appId: input.appId,
      boardId: input.boardId,
      status: input.status ?? 'active',
    };
  }

  async getBoardConfig(boardId: string): Promise<HostedBoardConfig | null> {
    const row = await this.db
      .prepare(
        `SELECT hosted_board_configs.id,
                hosted_board_configs.tenant_id,
                hosted_board_configs.app_id,
                hosted_board_configs.board_id,
                hosted_board_configs.github_connection_id,
                hosted_board_configs.status
         FROM hosted_board_configs
         JOIN hosted_tenants ON hosted_tenants.id = hosted_board_configs.tenant_id
         JOIN hosted_apps ON hosted_apps.id = hosted_board_configs.app_id
         WHERE hosted_board_configs.board_id = ?
           AND hosted_board_configs.status = 'active'
           AND hosted_tenants.status = 'active'
           AND hosted_apps.status = 'active'`
      )
      .bind(boardId)
      .first<HostedBoardConfigRow>();
    if (!row) {
      return null;
    }

    const [activeOrigins, tokenVerifier, githubConnection] = await Promise.all([
      this.listActiveOrigins(row.tenant_id, row.app_id),
      this.getActiveTokenVerifier(row.tenant_id, row.app_id),
      getActiveHostedGitHubConnection(this.db, row.tenant_id, row.app_id, row.github_connection_id),
    ]);

    return {
      id: row.id,
      tenantId: row.tenant_id,
      appId: row.app_id,
      boardId: row.board_id,
      status: row.status,
      activeOrigins,
      tokenVerifier,
      githubConnection,
    };
  }

  private async listActiveOrigins(tenantId: string, appId: string): Promise<string[]> {
    const result = await this.db
      .prepare(
        `SELECT origin
         FROM hosted_app_origins
         WHERE tenant_id = ?
           AND app_id = ?
           AND status = 'active'
         ORDER BY origin ASC`
      )
      .bind(tenantId, appId)
      .all<HostedOriginRow>();
    return result.results.map(row => row.origin);
  }

  private async getActiveTokenVerifier(
    tenantId: string,
    appId: string
  ): Promise<HostedTokenVerifierConfig | undefined> {
    const row = await this.db
      .prepare(
        `SELECT id,
                verifier_type,
                issuer,
                audience,
                jwks_url,
                public_key_pem,
                key_id,
                secret_ref,
                max_ttl_seconds,
                status,
                is_default
         FROM hosted_app_token_verifiers
         WHERE tenant_id = ?
           AND app_id = ?
           AND status = 'active'
         ORDER BY is_default DESC, created_at DESC
         LIMIT 1`
      )
      .bind(tenantId, appId)
      .first<HostedVerifierRow>();
    return row ? mapTokenVerifier(row) : undefined;
  }
}
