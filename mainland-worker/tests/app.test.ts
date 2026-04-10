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
    },
    {
      id: "user-2",
      username: "yun",
      displayName: "大脸猫的忠实粉丝",
      role: "user",
      passwordHash: "hashed:cat",
      createdAt: "2026-04-09T00:00:00.000Z"
    }
  ];

  const categories = [
    { slug: "python", name: "Python", order: 1, isDefault: true, count: 2 }
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
    },
    {
      id: "python-2",
      category: "python",
      question: "我上传的题目",
      answer: "我的答案",
      authorName: "管理员",
      createdAt: "2026-04-09T01:00:00.000Z",
      createdByUserId: "admin-1"
    }
  ];

  const pendingSyncCategories: string[] = [];
  const favorites = new Map<string, Set<string>>();

  function getFavoriteSet(userId: string) {
    const existing = favorites.get(userId);
    if (existing) {
      return existing;
    }

    const next = new Set<string>();
    favorites.set(userId, next);
    return next;
  }

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
      async getQuestions(category: string, userId?: string) {
        return questions
          .filter((question) => question.category === category)
          .map((question) => ({
            ...question,
            isFavorite: userId ? getFavoriteSet(userId).has(question.id) : false
          }));
      },
      async addQuestion(input: QuestionRecord) {
        questions.push(input);
        pendingSyncCategories.push(input.category);
        categories[0] = { ...categories[0], count: questions.length };
        return input;
      },
      async getQuestionsCreatedByUser(userId: string) {
        return questions.filter((question) => question.createdByUserId === userId).reverse();
      },
      async getFavoriteQuestions(userId: string) {
        const favoriteIds = getFavoriteSet(userId);
        return questions.filter((question) => favoriteIds.has(question.id)).reverse();
      },
      async addFavorite(userId: string, questionId: string) {
        const question = questions.find((item) => item.id === questionId);
        if (!question) {
          return false;
        }
        getFavoriteSet(userId).add(questionId);
        return true;
      },
      async removeFavorite(userId: string, questionId: string) {
        return getFavoriteSet(userId).delete(questionId);
      }
    } as never,
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
      categories: [{ slug: "python", count: 2 }]
    });
    const questionsPayload = await questionsResponse.json();
    expect(questionsPayload.questions).toEqual(
      expect.arrayContaining([expect.objectContaining({ category: "python", question: "原题", isFavorite: false })])
    );
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

  test("requires login for personal-center and favorite endpoints", async () => {
    const { app } = createInMemoryApp();

    const responses = await Promise.all([
      app.fetch(new Request("https://worker.example/api/me/questions")),
      app.fetch(new Request("https://worker.example/api/me/favorites")),
      app.fetch(
        new Request("https://worker.example/api/me/favorites", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ questionId: "python-1" })
        })
      ),
      app.fetch(new Request("https://worker.example/api/me/favorites/python-1", { method: "DELETE" }))
    ]);

    for (const response of responses) {
      expect(response.status).toBe(401);
    }
  });

  test("returns my uploaded questions and lets me favorite and unfavorite a question", async () => {
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

    const cookie = loginResponse.headers.get("set-cookie") ?? "";

    const myQuestionsResponse = await app.fetch(
      new Request("https://worker.example/api/me/questions", {
        headers: { cookie }
      })
    );

    expect(myQuestionsResponse.status).toBe(200);
    await expect(myQuestionsResponse.json()).resolves.toMatchObject({
      questions: [{ id: "python-2", question: "我上传的题目" }]
    });

    const favoriteResponse = await app.fetch(
      new Request("https://worker.example/api/me/favorites", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie
        },
        body: JSON.stringify({ questionId: "python-1" })
      })
    );

    expect(favoriteResponse.status).toBe(201);

    const categoryResponse = await app.fetch(
      new Request("https://worker.example/api/questions?category=python", {
        headers: { cookie }
      })
    );

    await expect(categoryResponse.json()).resolves.toMatchObject({
      questions: [
        { id: "python-1", isFavorite: true },
        { id: "python-2", isFavorite: false }
      ]
    });

    const myFavoritesResponse = await app.fetch(
      new Request("https://worker.example/api/me/favorites", {
        headers: { cookie }
      })
    );

    expect(myFavoritesResponse.status).toBe(200);
    await expect(myFavoritesResponse.json()).resolves.toMatchObject({
      questions: [{ id: "python-1", question: "原题" }]
    });

    const repeatFavoriteResponse = await app.fetch(
      new Request("https://worker.example/api/me/favorites", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie
        },
        body: JSON.stringify({ questionId: "python-1" })
      })
    );

    expect(repeatFavoriteResponse.status).toBe(201);

    const unfavoriteResponse = await app.fetch(
      new Request("https://worker.example/api/me/favorites/python-1", {
        method: "DELETE",
        headers: { cookie }
      })
    );

    expect(unfavoriteResponse.status).toBe(204);

    const unfavoritedCategoryResponse = await app.fetch(
      new Request("https://worker.example/api/questions?category=python", {
        headers: { cookie }
      })
    );

    const unfavoritedPayload = await unfavoritedCategoryResponse.json();
    expect(unfavoritedPayload.questions).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "python-1", isFavorite: false })])
    );
  });
});
