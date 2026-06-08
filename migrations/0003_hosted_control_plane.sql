CREATE TABLE hosted_tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK(status IN ('active', 'paused', 'disabled'))
);

CREATE TABLE hosted_apps (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES hosted_tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(tenant_id, slug),
  CHECK(status IN ('active', 'paused', 'disabled'))
);

CREATE TABLE hosted_app_origins (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES hosted_tenants(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL REFERENCES hosted_apps(id) ON DELETE CASCADE,
  origin TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(app_id, origin),
  CHECK(status IN ('active', 'disabled'))
);

CREATE INDEX idx_hosted_app_origins_app_status
  ON hosted_app_origins(app_id, status, origin);

CREATE TABLE hosted_app_token_verifiers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES hosted_tenants(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL REFERENCES hosted_apps(id) ON DELETE CASCADE,
  verifier_type TEXT NOT NULL,
  issuer TEXT NOT NULL,
  audience TEXT NOT NULL,
  jwks_url TEXT,
  public_key_pem TEXT,
  key_id TEXT,
  secret_ref TEXT,
  max_ttl_seconds INTEGER NOT NULL DEFAULT 300,
  status TEXT NOT NULL DEFAULT 'active',
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK(verifier_type IN ('jwks', 'public_key', 'hmac_legacy')),
  CHECK(max_ttl_seconds > 0),
  CHECK(status IN ('active', 'disabled')),
  CHECK(is_default IN (0, 1))
);

CREATE INDEX idx_hosted_token_verifiers_app_status
  ON hosted_app_token_verifiers(app_id, status, is_default);

CREATE TABLE hosted_github_connections (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES hosted_tenants(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL REFERENCES hosted_apps(id) ON DELETE CASCADE,
  installation_id TEXT,
  account_login TEXT,
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK(status IN ('pending', 'active', 'suspended', 'disabled'))
);

CREATE TABLE hosted_board_configs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES hosted_tenants(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL REFERENCES hosted_apps(id) ON DELETE CASCADE,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  github_connection_id TEXT REFERENCES hosted_github_connections(id),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(board_id),
  UNIQUE(tenant_id, app_id, board_id),
  CHECK(status IN ('active', 'paused', 'disabled'))
);

CREATE INDEX idx_hosted_board_configs_scope
  ON hosted_board_configs(tenant_id, app_id, board_id, status);

CREATE TABLE hosted_audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT REFERENCES hosted_tenants(id) ON DELETE SET NULL,
  app_id TEXT REFERENCES hosted_apps(id) ON DELETE SET NULL,
  board_id TEXT REFERENCES boards(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL,
  actor_ref_hash TEXT,
  event_type TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK(actor_type IN ('host_user', 'operator', 'system'))
);

CREATE INDEX idx_hosted_audit_events_scope
  ON hosted_audit_events(tenant_id, app_id, board_id, id);
