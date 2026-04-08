import { describe, expect, test } from "vitest";
import { ensureBootstrapAdmin } from "../src/index";
import type { CreateUserInput, UpdateUserInput, UserRecord } from "../src/types";

function createMemoryUserStore(initialUsers: UserRecord[] = []) {
  const users = [...initialUsers];

  return {
    users,
    store: {
      async getByUsername(username: string) {
        return users.find((user) => user.username === username) ?? null;
      },
      async getById(id: string) {
        return users.find((user) => user.id === id) ?? null;
      },
      async list() {
        return users;
      },
      async create(input: CreateUserInput) {
        const user = {
          id: `user-${users.length + 1}`,
          createdAt: "2026-04-08T00:00:00.000Z",
          ...input
        };
        users.push(user);
        return user;
      },
      async update(id: string, input: UpdateUserInput) {
        const user = users.find((item) => item.id === id) ?? null;
        if (!user) {
          return null;
        }
        Object.assign(user, input);
        return user;
      },
      async delete(id: string) {
        const index = users.findIndex((item) => item.id === id);
        if (index === -1) {
          return false;
        }
        users.splice(index, 1);
        return true;
      }
    }
  };
}

describe("ensureBootstrapAdmin", () => {
  test("creates the bootstrap admin when missing", async () => {
    const { users, store } = createMemoryUserStore();

    await ensureBootstrapAdmin(
      {
        COOKIE_SECRET: "secret",
        GITHUB_TOKEN: "token",
        GITHUB_REPO: "owner/repo",
        UI_ORIGIN: "https://example.com",
        DB: {} as D1Database,
        BOOTSTRAP_ADMIN_USERNAME: "admin",
        BOOTSTRAP_ADMIN_DISPLAY_NAME: "管理员",
        BOOTSTRAP_ADMIN_PASSWORD_HASH: "hashed:secret"
      },
      store
    );

    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({
      username: "admin",
      displayName: "管理员",
      role: "admin"
    });
  });

  test("does not create a second bootstrap admin when one already exists", async () => {
    const { users, store } = createMemoryUserStore([
      {
        id: "admin-1",
        username: "admin",
        displayName: "管理员",
        role: "admin",
        passwordHash: "hashed:secret",
        createdAt: "2026-04-08T00:00:00.000Z"
      }
    ]);

    await ensureBootstrapAdmin(
      {
        COOKIE_SECRET: "secret",
        GITHUB_TOKEN: "token",
        GITHUB_REPO: "owner/repo",
        UI_ORIGIN: "https://example.com",
        DB: {} as D1Database,
        BOOTSTRAP_ADMIN_USERNAME: "admin",
        BOOTSTRAP_ADMIN_DISPLAY_NAME: "管理员",
        BOOTSTRAP_ADMIN_PASSWORD_HASH: "hashed:secret"
      },
      store
    );

    expect(users).toHaveLength(1);
  });
});
