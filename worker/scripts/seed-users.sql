INSERT INTO users (id, username, display_name, role, password_hash, created_at)
VALUES (
  '672d491c-881a-4517-a2c0-167ae82918a3',
  'admin',
  '管理员',
  'admin',
  'pbkdf2$100000$6KafYT58VFNJi2YwziC2hg==$zGqHtZRwNEHY83HpnpV/6qN12sNGXbXKu11PYQ0sV0c=',
  '2026-04-08T14:33:27.989Z'
)
ON CONFLICT(id) DO UPDATE SET
  username = excluded.username,
  display_name = excluded.display_name,
  role = excluded.role,
  password_hash = excluded.password_hash,
  created_at = excluded.created_at;

INSERT INTO users (id, username, display_name, role, password_hash, created_at)
VALUES (
  'e0740878-d345-4dbb-bf02-5e42b3570a00',
  'yun',
  '大脸猫的忠实粉丝',
  'user',
  'pbkdf2$100000$4hF9szo86lXPYY1uK4WBxQ==$UIS2aczM5JR1Qhm/C63IY8Zxb29HZWWqRmiZCg9LEA4=',
  '2026-04-08T15:00:43.341Z'
)
ON CONFLICT(id) DO UPDATE SET
  username = excluded.username,
  display_name = excluded.display_name,
  role = excluded.role,
  password_hash = excluded.password_hash,
  created_at = excluded.created_at;
