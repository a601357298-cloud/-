CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  is_default INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  category_slug TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  author_name TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL CHECK(sync_status IN ('pending', 'synced', 'failed')),
  last_synced_at TEXT,
  sync_error TEXT,
  FOREIGN KEY (category_slug) REFERENCES categories(slug),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sync_jobs (
  id TEXT PRIMARY KEY,
  job_type TEXT NOT NULL,
  target_path TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'processing', 'failed', 'completed')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_questions_category_slug ON questions(category_slug);
CREATE INDEX IF NOT EXISTS idx_questions_sync_status ON questions(sync_status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);
