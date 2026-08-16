-- Preserve every board-dependent row while rebuilding `boards` without the
-- legacy UNIQUE(repo_owner, repo_name) constraint. D1 migrations execute as an
-- atomic batch, so these unconstrained backup tables never become observable.
CREATE TABLE _migration_0004_boards AS SELECT * FROM boards;
CREATE TABLE _migration_0004_board_items AS SELECT * FROM board_items;
CREATE TABLE _migration_0004_board_votes AS SELECT * FROM board_votes;
CREATE TABLE _migration_0004_board_events AS SELECT * FROM board_events;
CREATE TABLE _migration_0004_hosted_board_configs AS SELECT * FROM hosted_board_configs;
CREATE TABLE _migration_0004_hosted_audit_events AS SELECT * FROM hosted_audit_events;

DROP TABLE board_votes;
DROP TABLE board_events;
DROP TABLE hosted_board_configs;
DROP TABLE hosted_audit_events;
DROP TABLE board_items;
DROP TABLE boards;

CREATE TABLE boards (
  id TEXT PRIMARY KEY,
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE board_items (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  github_issue_number INTEGER,
  github_issue_url TEXT,
  upvote_count INTEGER NOT NULL DEFAULT 0,
  created_by_external_user_id TEXT NOT NULL,
  created_by_display_name TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK(status IN ('open', 'planned', 'in_progress', 'shipped', 'closed')),
  CHECK(upvote_count >= 0)
);

CREATE INDEX idx_board_items_board_recent ON board_items(board_id, created_at DESC);
CREATE INDEX idx_board_items_board_votes ON board_items(board_id, upvote_count DESC, created_at DESC);

CREATE TABLE board_votes (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES board_items(id) ON DELETE CASCADE,
  external_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(board_id, item_id, external_user_id)
);

CREATE TABLE board_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  item_id TEXT REFERENCES board_items(id) ON DELETE CASCADE,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_board_events_board_id ON board_events(board_id, id);

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

INSERT INTO boards
SELECT * FROM _migration_0004_boards;

INSERT INTO board_items
SELECT * FROM _migration_0004_board_items;

INSERT INTO board_votes
SELECT * FROM _migration_0004_board_votes;

INSERT INTO board_events
SELECT * FROM _migration_0004_board_events;

INSERT INTO hosted_board_configs
SELECT * FROM _migration_0004_hosted_board_configs;

INSERT INTO hosted_audit_events
SELECT * FROM _migration_0004_hosted_audit_events;

DROP TABLE _migration_0004_boards;
DROP TABLE _migration_0004_board_items;
DROP TABLE _migration_0004_board_votes;
DROP TABLE _migration_0004_board_events;
DROP TABLE _migration_0004_hosted_board_configs;
DROP TABLE _migration_0004_hosted_audit_events;
