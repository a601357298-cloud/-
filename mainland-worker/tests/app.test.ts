import { describe, expect, test } from "vitest";
import { createApp } from "../src/app";
import type { CreateUserInput, QuestionRecord, UpdateUserInput, UserRecord, UserRole } from "../src/types";

function createMemorySessionService() {
  const sessions = new Map<string, { userId: string; role: UserRole }>();

  return {
    async issue(user: { userId: string; role: UserRole }) {
      const token = `token-${user.userId}`;
      sessions.set(token, user);
      return `mainland_session=${token}; Path=/; HttpOnly; SameSite=None`;
    },
    async read(request: Request) {
      const cookie = request.headers.get("cookie") ?? "";
      const token = cookie.split("mainland_session=")[1]?.split(";")[0];
      return token ? sessions.get(token) ?? null : null;
    },
    clear() {
      return "mainland_session=; Path=/; Max-Age=0; HttpOnly; SameSite=None";
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
      createdAt: "2026-04-09T00:00:00.000Z"
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
      createdAt: "2026-04-09T00:00:00.000Z",
      createdByUserId: "seed"
    }
  ];

  const pendingSyncCategories: string[] = [];

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
          createdAt: "2026-04-09T00:00:00.000Z"
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
        pendingSyncCategories.push(input.category);
        categories[0] = { ...categories[0], count: questions.length };
        return input;
      }
    },
    now() {
      return "2026-04-09T00:00:00.000Z";
    },
    randomId() {
      return "generated-id";
    }
  });

  return { app, questions, pendingSyncCategories };
}

describe("mainland worker app", () => {
  test("returns categories and questions from the D1-backed repo", async () => {
    const { app } = createInMemoryApp();

    const categoriesResponse = await app.fetch(
      new Request("https://worker.example/api/categories")
    );
    const questionsResponse = await app.fetch(
      new Request("https://worker.example/api/questions?category=python")
    );

    expect(categoriesResponse.status).toBe(200);
    expect(questionsResponse.status).toBe(200);
    await expect(categoriesResponse.json()).resolves.toMatchObject({
      categories: [{ slug: "python", count: 1 }]
    });
    await expect(questionsResponse.json()).resolves.toMatchObject({
      questions: [{ category: "python", question: "原题" }]
    });
  });

  test("creates a question and leaves it pending GitHub sync", async () => {
    const { app, questions, pendingSyncCategories } = createInMemoryApp();

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

    const cookie = loginResponse.headers.get("set-cookie") ?? "";

    const response = await app.fetch(
      new Request("https://worker.example/api/questions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie
        },
        body: JSON.stringify({
          category: "python",
          question: "新题目",
          answer: "新答案",
          authorName: "管理员"
        })
      })
    );

    expect(response.status).toBe(201);
    expect(questions.at(-1)).toMatchObject({
      category: "python",
      question: "新题目"
    });
    expect(pendingSyncCategories).toEqual(["python"]);
  });
});
