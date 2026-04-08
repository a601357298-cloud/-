import type { CreateUserInput, UserRecord, UserStore } from "../types";

interface D1UserRow {
  id: string;
  username: string;
  display_name: string;
  role: "admin" | "user";
  password_hash: string;
  created_at: string;
}

function mapRow(row: D1UserRow): UserRecord {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    passwordHash: row.password_hash,
    createdAt: row.created_at
  };
}

export class D1UserStore implements UserStore {
  constructor(private db: D1Database, private now: () => string, private randomId: () => string) {}

  async getByUsername(username: string) {
    const row = await this.db
      .prepare(
        "SELECT id, username, display_name, role, password_hash, created_at FROM users WHERE username = ?1"
      )
      .bind(username)
      .first<D1UserRow>();

    return row ? mapRow(row) : null;
  }

  async getById(id: string) {
    const row = await this.db
      .prepare("SELECT id, username, display_name, role, password_hash, created_at FROM users WHERE id = ?1")
      .bind(id)
      .first<D1UserRow>();

    return row ? mapRow(row) : null;
  }

  async list() {
    const result = await this.db
      .prepare("SELECT id, username, display_name, role, password_hash, created_at FROM users ORDER BY created_at ASC")
      .all<D1UserRow>();

    return (result.results ?? []).map(mapRow);
  }

  async create(input: CreateUserInput) {
    const user: UserRecord = {
      id: this.randomId(),
      createdAt: this.now(),
      ...input
    };

    await this.db
      .prepare(
        "INSERT INTO users (id, username, display_name, role, password_hash, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
      )
      .bind(
        user.id,
        user.username,
        user.displayName,
        user.role,
        user.passwordHash,
        user.createdAt
      )
      .run();

    return user;
  }
}

