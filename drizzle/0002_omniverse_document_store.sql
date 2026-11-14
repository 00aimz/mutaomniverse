CREATE TABLE docs (
  key TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
DROP TABLE entries;
