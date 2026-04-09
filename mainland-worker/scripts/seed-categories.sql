INSERT INTO categories (slug, name, sort_order, is_default, created_at)
VALUES ('shentong-db', '神通数据库', 1, 0, '2026-04-09T00:00:00.000Z')
ON CONFLICT(slug) DO UPDATE SET
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_default = excluded.is_default;

INSERT INTO categories (slug, name, sort_order, is_default, created_at)
VALUES ('oracle', 'Oracle', 2, 0, '2026-04-09T00:00:00.000Z')
ON CONFLICT(slug) DO UPDATE SET
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_default = excluded.is_default;

INSERT INTO categories (slug, name, sort_order, is_default, created_at)
VALUES ('python', 'Python', 3, 1, '2026-04-09T00:00:00.000Z')
ON CONFLICT(slug) DO UPDATE SET
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_default = excluded.is_default;

INSERT INTO categories (slug, name, sort_order, is_default, created_at)
VALUES ('wps', 'WPS', 4, 0, '2026-04-09T00:00:00.000Z')
ON CONFLICT(slug) DO UPDATE SET
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_default = excluded.is_default;

INSERT INTO categories (slug, name, sort_order, is_default, created_at)
VALUES ('cybersecurity', '网络安全', 5, 0, '2026-04-09T00:00:00.000Z')
ON CONFLICT(slug) DO UPDATE SET
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_default = excluded.is_default;

INSERT INTO categories (slug, name, sort_order, is_default, created_at)
VALUES ('graph-db', '图数据库', 6, 0, '2026-04-09T00:00:00.000Z')
ON CONFLICT(slug) DO UPDATE SET
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_default = excluded.is_default;

INSERT INTO categories (slug, name, sort_order, is_default, created_at)
VALUES ('other', '其他', 7, 0, '2026-04-09T00:00:00.000Z')
ON CONFLICT(slug) DO UPDATE SET
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_default = excluded.is_default;
