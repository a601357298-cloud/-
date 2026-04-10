CREATE TABLE IF NOT EXISTS question_favorites (
  user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, question_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

CREATE INDEX IF NOT EXISTS idx_question_favorites_user_created_at
ON question_favorites(user_id, created_at DESC);
