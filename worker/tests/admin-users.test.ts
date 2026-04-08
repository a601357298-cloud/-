import { describe, expect, test } from "vitest";
import { createApp } from "../src/app";
import type { CreateUserInput, QuestionRecord, UserRecord, UserRole } from "../src/types";

function createMemorySessionService() {
  const sessions = new Map<string, { userId: string; role: UserRole }>();

  return {
    async issue(user: { userId: string; role: UserRole }) {
      const token = `token-${user.userId}`;
      sessions.set(token, user);
      return `session=${token}; Path=/; HttpOnly; SameSite=None`;
    },
    async read(request: Request) {
      const cookie = request.headers.get("cookie") ?? "";
      const token = cookie.split("session=")[1]?.split(";")[0];
      return token ? sessions.get(token) ?? null : null;
    },
    clear() {
      return "session=; Path=/; Max-Age=0; HttpOnly; SameSite=None";
    }
  };
}

function createAdminApp() {
  const users: UserRecord[] = [
    {
      id: "admin-1",
      username: "admin",
      displayName: "管理员",
      role: "admin",
      passwordHash: "hashed:secret",
      createdAt: "2026-04-08T00:00:00.000Z"
    },
    {
      id: "user-1",
      username: "yun",
      displayName: "旧昵称",
      role: "user",
      passwordHash: "hashed:123456",
      createdAt: "2026-04-08T00:00:00.000Z"
    }
  ];

  const app = createApp({
    passwordService: {
      async verify(password, hash) {
        return hash === `hashed:${password}`;
      },
      async hash(password) {
        return `hashed:${password}`;
      }
    },
    sessionService: createMemorySessionService(),
    userStore: {
      async getByUsername(username) {
        return users.find((user) => user.username === username) ?? null;
      },
      async getById(id) {
        return users.find((user) => user.id === id) ?? null;
      },
      async list() {
        return users;
      },
      async create(input: CreateUserInput) {
        const user = {
          ...input,
          id: `user-${users.length + 1}`,
          createdAt: "2026-04-08T00:00:00.000Z"
        };
        users.push(user);
        return user;
      },
      async update(id, input) {
        const target = users.find((user) => user.id === id);
        if (!target) {
          return null;
        }
        Object.assign(target, input);
        return target;
      },
      async delete(id) {
        const index = users.findIndex((user) => user.id === id);
        if (index === -1) {
          return false;
        }
        users.splice(index, 1);
        return true;
      }
    },
    questionRepo: {
      async listCategories() {
        return [];
      },
      async getQuestions() {
        return [] as QuestionRecord[];
      },
      async addQuestion(input) {
        return input;
      }
    }
  });

  return { app, users };
}

async function loginAsAdmin(app: { fetch(request: Request): Promise<Response> }) {
  const loginResponse = await app.fetch(
    new Request("https://worker.example/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "admin",
        password: "secret"
      })
    })
  );

  return loginResponse.headers.get("set-cookie") ?? "";
}

describe("admin user management", () => {
  test("allows admins to update username, nickname and password", async () => {
    const { app, users } = createAdminApp();
    const cookie = await loginAsAdmin(app);

    const response = await app.fetch(
      new Request("https://worker.example/api/admin/users/user-1", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          cookie
        },
        body: JSON.stringify({
          username: "new-yun",
          displayName: "新昵称",
          password: "abcdef"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(users.find((user) => user.id === "user-1")).toMatchObject({
      username: "new-yun",
      displayName: "新昵称",
      passwordHash: "hashed:abcdef"
    });
  });

  test("allows admins to delete another account", async () => {
    const { app, users } = createAdminApp();
    const cookie = await loginAsAdmin(app);

    const response = await app.fetch(
      new Request("https://worker.example/api/admin/users/user-1", {
        method: "DELETE",
        headers: {
          cookie
        }
      })
    );

    expect(response.status).toBe(204);
    expect(users.some((user) => user.id === "user-1")).toBe(false);
  });
});

