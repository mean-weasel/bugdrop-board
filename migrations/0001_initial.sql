CREATE TABLE boards (
  id TEXT PRIMARY KEY,
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(repo_owner, repo_name)
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
