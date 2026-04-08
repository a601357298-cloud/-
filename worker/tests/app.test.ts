import { describe, expect, test } from "vitest";
import { createApp } from "../src/app";
import type { CreateUserInput, QuestionRecord, UpdateUserInput, UserRecord, UserRole } from "../src/types";

function createMemorySessionService() {
  const sessions = new Map<string, { userId: string; role: UserRole }>();

  return {
    async issue(user: { userId: string; role: UserRole }) {
      const token = `token-${user.userId}`;
      sessions.set(token, user);
      return `session=${token}; Path=/; HttpOnly; SameSite=Lax`;
    },
    async read(request: Request) {
      const cookie = request.headers.get("cookie") ?? "";
      const token = cookie.split("session=")[1]?.split(";")[0];
      return token ? sessions.get(token) ?? null : null;
    },
    clear() {
      return "session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax";
    }
  };
}

function createInMemoryApp() {
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
      username: "zhangsan",
      displayName: "张三",
      role: "user",
      passwordHash: "hashed:123456",
      createdAt: "2026-04-08T00:00:00.000Z"
    }
  ];

  const categories = [
    { slug: "python", name: "Python", order: 1, isDefault: true, count: 1 }
  ];

  const questions: QuestionRecord[] = [
    {
      id: "python-1",
      category: "python",
      question: "原题",
      answer: "原答案",
      authorName: "系统预置",
      createdAt: "2026-04-08T00:00:00.000Z",
      createdByUserId: "seed"
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
    },
    questionRepo: {
      async listCategories() {
        return categories;
      },
      async getQuestions() {
        return questions;
      },
      async addQuestion(input: QuestionRecord) {
        questions.push(input);
        categories[0] = { ...categories[0], count: questions.length };
        return input;
      }
    },
    now() {
      return "2026-04-08T00:00:00.000Z";
    },
    randomId() {
      return "generated-id";
    }
  });

  return { app, questions };
}

describe("worker app", () => {
  test("logs in and returns the current user", async () => {
    const { app } = createInMemoryApp();

    const loginResponse = await app.fetch(
      new Request("https://worker.example/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: "zhangsan",
          password: "123456"
        })
      })
    );

    expect(loginResponse.status).toBe(200);
    const sessionCookie = loginResponse.headers.get("set-cookie");
    expect(sessionCookie).toContain("session=");

    const meResponse = await app.fetch(
      new Request("https://worker.example/api/auth/me", {
        headers: { cookie: sessionCookie ?? "" }
      })
    );

    expect(meResponse.status).toBe(200);
    await expect(meResponse.json()).resolves.toMatchObject({
      user: {
        username: "zhangsan",
        displayName: "张三",
        role: "user"
      }
    });
  });

  test("blocks anonymous uploads and strips author impersonation for normal users", async () => {
    const { app, questions } = createInMemoryApp();

    const blockedResponse = await app.fetch(
      new Request("https://worker.example/api/questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category: "python",
          question: "新题目",
          answer: "新答案"
        })
      })
    );

    expect(blockedResponse.status).toBe(401);

    const loginResponse = await app.fetch(
      new Request("https://worker.example/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: "zhangsan",
          password: "123456"
        })
      })
    );

    const sessionCookie = loginResponse.headers.get("set-cookie") ?? "";

    const uploadResponse = await app.fetch(
      new Request("https://worker.example/api/questions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: sessionCookie
        },
        body: JSON.stringify({
          category: "python",
          question: "新题目",
          answer: "新答案",
          authorName: "伪装作者"
        })
      })
    );

    expect(uploadResponse.status).toBe(201);
    expect(questions.at(-1)).toMatchObject({
      authorName: "张三"
    });
  });

  test("allows admins to create accounts", async () => {
    const { app } = createInMemoryApp();

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

    const sessionCookie = loginResponse.headers.get("set-cookie") ?? "";

    const createResponse = await app.fetch(
      new Request("https://worker.example/api/admin/users", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: sessionCookie
        },
        body: JSON.stringify({
          username: "lisi",
          displayName: "李四",
          password: "654321",
          role: "user"
        })
      })
    );

    expect(createResponse.status).toBe(201);
    await expect(createResponse.json()).resolves.toMatchObject({
      user: {
        username: "lisi",
        displayName: "李四",
        role: "user"
      }
    });
  });
});
