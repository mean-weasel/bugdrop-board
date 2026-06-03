CREATE TABLE request_throttle_windows (
  key TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  board_id TEXT NOT NULL,
  external_user_id TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK(count >= 0)
);

CREATE INDEX idx_request_throttle_expires ON request_throttle_windows(expires_at);
CREATE INDEX idx_request_throttle_board_user
  ON request_throttle_windows(board_id, external_user_id, action);
