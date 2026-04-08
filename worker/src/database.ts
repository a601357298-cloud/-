import type { CreateUserInput, UpdateUserInput, UserRecord, UserStore } from "./types";

interface UserRow {
  id: string;
  username: string;
  displayName: string;
  role: UserRecord["role"];
  passwordHash: string;
  createdAt: string;
}

function toUserRecord(row: UserRow | null) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    role: row.role,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt
  } satisfies UserRecord;
}

export class D1UserStore implements UserStore {
  constructor(
    private db: D1Database,
    private now: () => string,
    private randomId: () => string
  ) {}

  async getByUsername(username: string) {
    const row = await this.db
      .prepare(
        `SELECT
          id,
          username,
          display_name AS displayName,
          role,
          password_hash AS passwordHash,
          created_at AS createdAt
        FROM users
        WHERE username = ?1
        LIMIT 1`
      )
      .bind(username)
      .first<UserRow>();

    return toUserRecord(row ?? null);
  }

  async getById(id: string) {
    const row = await this.db
      .prepare(
        `SELECT
          id,
          username,
          display_name AS displayName,
          role,
          password_hash AS passwordHash,
          created_at AS createdAt
        FROM users
        WHERE id = ?1
        LIMIT 1`
      )
      .bind(id)
      .first<UserRow>();

    return toUserRecord(row ?? null);
  }

  async list() {
    const result = await this.db
      .prepare(
        `SELECT
          id,
          username,
          display_name AS displayName,
          role,
          password_hash AS passwordHash,
          created_at AS createdAt
        FROM users
        ORDER BY created_at ASC`
      )
      .all<UserRow>();

    return result.results.map((row) => toUserRecord(row)).filter((row): row is UserRecord => row !== null);
  }

  async create(input: CreateUserInput) {
    const user: UserRecord = {
      id: this.randomId(),
      createdAt: this.now(),
      ...input
    };

    await this.db
      .prepare(
        `INSERT INTO users (
          id,
          username,
          display_name,
          role,
          password_hash,
          created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
      )
      .bind(user.id, user.username, user.displayName, user.role, user.passwordHash, user.createdAt)
      .run();

    return user;
  }

  async update(id: string, input: UpdateUserInput) {
    const current = await this.getById(id);
    if (!current) {
      return null;
    }

    const next: UserRecord = {
      ...current,
      ...input
    };

    await this.db
      .prepare(
        `UPDATE users
        SET username = ?1,
            display_name = ?2,
            role = ?3,
            password_hash = ?4
        WHERE id = ?5`
      )
      .bind(next.username, next.displayName, next.role, next.passwordHash, id)
      .run();

    return next;
  }

  async delete(id: string) {
    const result = await this.db.prepare("DELETE FROM users WHERE id = ?1").bind(id).run();
    return Boolean(result.meta?.changes);
  }
}
