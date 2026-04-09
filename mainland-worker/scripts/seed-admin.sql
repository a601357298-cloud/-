INSERT INTO users (id, username, display_name, role, password_hash, created_at)
VALUES (
  'mainland-admin',
  'admin',
  '管理员',
  'admin',
  'pbkdf2$100000$y+paAGzO3sG/ZwQXNiUnXg==$sBVL8rrUpm1Sy4fYIBv/LGmz0CtsCck0ybbSQzUn+oU=',
  '2026-04-09T00:00:00.000Z'
)
ON CONFLICT(username) DO UPDATE SET
  display_name = excluded.display_name,
  role = excluded.role,
  password_hash = excluded.password_hash;
