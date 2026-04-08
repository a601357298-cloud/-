import { describe, expect, test } from "vitest";
import { D1UserStore } from "../src/database";
import type { CreateUserInput, UserRecord, UserRole } from "../src/types";

type BoundValue = string | null;

class FakeD1PreparedStatement {
  constructor(
    private database: FakeD1Database,
    private sql: string,
    private params: BoundValue[] = []
  ) {}

  bind(...params: BoundValue[]) {
    return new FakeD1PreparedStatement(this.database, this.sql, params);
  }

  async first<T>() {
    return this.database.first<T>(this.sql, this.params);
  }

  async all<T>() {
    return this.database.all<T>(this.sql);
  }

  async run() {
    return this.database.run(this.sql, this.params);
  }
}

class FakeD1Database {
  rows: UserRecord[] = [];

  prepare(sql: string) {
    return new FakeD1PreparedStatement(this, sql);
  }

  async first<T>(sql: string, params: BoundValue[]) {
    if (sql.includes("WHERE username = ?1")) {
      return (this.rows.find((row) => row.username === params[0]) ?? null) as T | null;
    }

    if (sql.includes("WHERE id = ?1")) {
      return (this.rows.find((row) => row.id === params[0]) ?? null) as T | null;
    }

    return null;
  }

  async all<T>(sql: string) {
    if (sql.includes("SELECT id, username, display_name")) {
      return {
        results: [...this.rows].sort((left, right) => left.createdAt.localeCompare(right.createdAt)) as T[]
      };
    }

    return { results: [] as T[] };
  }

  async run(sql: string, params: BoundValue[]) {
    if (sql.startsWith("INSERT INTO users")) {
      this.rows.push({
        id: String(params[0]),
        username: String(params[1]),
        displayName: String(params[2]),
        role: params[3] as UserRole,
        passwordHash: String(params[4]),
        createdAt: String(params[5])
      });
      return { success: true };
    }

    if (sql.startsWith("UPDATE users")) {
      const target = this.rows.find((row) => row.id === params[4]);
      if (!target) {
        return { success: true, meta: { changes: 0 } };
      }

      target.username = String(params[0]);
      target.displayName = String(params[1]);
      target.role = params[2] as UserRole;
      target.passwordHash = String(params[3]);
      return { success: true, meta: { changes: 1 } };
    }

    if (sql.startsWith("DELETE FROM users")) {
      const before = this.rows.length;
      this.rows = this.rows.filter((row) => row.id !== params[0]);
      return { success: true, meta: { changes: before - this.rows.length } };
    }

    return { success: true };
  }
}

function createStore() {
  const database = new FakeD1Database();
  const store = new D1UserStore(database as unknown as D1Database, () => "2026-04-08T00:00:00.000Z", () => "new-id");
  return { database, store };
}

describe("D1UserStore", () => {
  test("creates and reads users from D1", async () => {
    const { store } = createStore();
    const input: CreateUserInput = {
      username: "yun",
      displayName: "大脸猫的忠实粉丝",
      role: "user",
      passwordHash: "hashed:123456"
    };

    const created = await store.create(input);
    const found = await store.getByUsername("yun");

    expect(created).toMatchObject({
      id: "new-id",
      username: "yun"
    });
    expect(found).toMatchObject({
      displayName: "大脸猫的忠实粉丝",
      role: "user"
    });
  });

  test("updates and deletes users in D1", async () => {
    const { database, store } = createStore();
    database.rows.push({
      id: "user-1",
      username: "yun",
      displayName: "旧昵称",
      role: "user",
      passwordHash: "hashed:old",
      createdAt: "2026-04-08T00:00:00.000Z"
    });

    const updated = await store.update("user-1", {
      username: "new-yun",
      displayName: "新昵称",
      role: "admin",
      passwordHash: "hashed:new"
    });
    const removed = await store.delete("user-1");

    expect(updated).toMatchObject({
      username: "new-yun",
      displayName: "新昵称",
      role: "admin",
      passwordHash: "hashed:new"
    });
    expect(removed).toBe(true);
    await expect(store.getById("user-1")).resolves.toBeNull();
  });
});
