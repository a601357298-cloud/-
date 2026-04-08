import { corsPreflight, empty, json, readJson, sanitizeText } from "./http";
import type { AppDeps, PublicUser, QuestionRecord, UserRecord, UserRole } from "./types";

interface LoginBody {
  username?: string;
  password?: string;
}

interface QuestionBody {
  category?: string;
  question?: string;
  answer?: string;
  authorName?: string;
}

interface CreateUserBody {
  username?: string;
  displayName?: string;
  password?: string;
  role?: UserRole;
}

function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt
  };
}

async function getCurrentUser(request: Request, deps: AppDeps) {
  const session = await deps.sessionService.read(request);
  if (!session) {
    return null;
  }

  return deps.userStore.getById(session.userId);
}

export function createApp(deps: AppDeps) {
  const now = deps.now ?? (() => new Date().toISOString());
  const randomId =
    deps.randomId ??
    (() => {
      if ("randomUUID" in crypto) {
        return crypto.randomUUID();
      }

      return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    });

  return {
    async fetch(request: Request) {
      const url = new URL(request.url);

      if (request.method === "OPTIONS") {
        return corsPreflight(request, deps.uiOrigin);
      }

      if (url.pathname === "/api/auth/login" && request.method === "POST") {
        const body = await readJson<LoginBody>(request);
        const username = sanitizeText(body?.username);
        const password = sanitizeText(body?.password);

        if (!username || !password) {
          return json({ error: "用户名和密码不能为空。" }, { status: 400 }, request, deps.uiOrigin);
        }

        const user = await deps.userStore.getByUsername(username);
        if (!user) {
          return json({ error: "用户名或密码错误。" }, { status: 401 }, request, deps.uiOrigin);
        }

        const isValid = await deps.passwordService.verify(password, user.passwordHash);
        if (!isValid) {
          return json({ error: "用户名或密码错误。" }, { status: 401 }, request, deps.uiOrigin);
        }

        const setCookie = await deps.sessionService.issue({
          userId: user.id,
          role: user.role
        });

        return json(
          { user: toPublicUser(user) },
          {
            status: 200,
            headers: {
              "set-cookie": setCookie
            }
          },
          request,
          deps.uiOrigin
        );
      }

      if (url.pathname === "/api/auth/logout" && request.method === "POST") {
        return empty(
          {
            status: 204,
            headers: {
              "set-cookie": deps.sessionService.clear()
            }
          },
          request,
          deps.uiOrigin
        );
      }

      if (url.pathname === "/api/auth/me" && request.method === "GET") {
        const user = await getCurrentUser(request, deps);
        return json({ user: user ? toPublicUser(user) : null }, { status: 200 }, request, deps.uiOrigin);
      }

      if (url.pathname === "/api/categories" && request.method === "GET") {
        const categories = await deps.questionRepo.listCategories();
        return json({ categories }, { status: 200 }, request, deps.uiOrigin);
      }

      if (url.pathname === "/api/questions" && request.method === "GET") {
        const category = sanitizeText(url.searchParams.get("category"));
        if (!category) {
          return json({ error: "缺少分类参数。" }, { status: 400 }, request, deps.uiOrigin);
        }

        const categories = await deps.questionRepo.listCategories();
        const exists = categories.some((entry) => entry.slug === category);
        if (!exists) {
          return json({ error: "分类不存在。" }, { status: 404 }, request, deps.uiOrigin);
        }

        const questions = await deps.questionRepo.getQuestions(category);
        return json({ questions }, { status: 200 }, request, deps.uiOrigin);
      }

      if (url.pathname === "/api/questions" && request.method === "POST") {
        const user = await getCurrentUser(request, deps);
        if (!user) {
          return json({ error: "请先登录。" }, { status: 401 }, request, deps.uiOrigin);
        }

        const body = await readJson<QuestionBody>(request);
        const category = sanitizeText(body?.category);
        const questionText = sanitizeText(body?.question);
        const answerText = sanitizeText(body?.answer);
        const requestedAuthorName = sanitizeText(body?.authorName);

        if (!category || !questionText || !answerText) {
          return json({ error: "题目、答案和分类不能为空。" }, { status: 400 }, request, deps.uiOrigin);
        }

        const categories = await deps.questionRepo.listCategories();
        const exists = categories.some((entry) => entry.slug === category);
        if (!exists) {
          return json({ error: "分类不存在。" }, { status: 404 }, request, deps.uiOrigin);
        }

        const authorName =
          user.role === "admin" && requestedAuthorName ? requestedAuthorName : user.displayName;

        const question: QuestionRecord = {
          id: randomId(),
          category,
          question: questionText,
          answer: answerText,
          authorName,
          createdAt: now(),
          createdByUserId: user.id
        };

        const saved = await deps.questionRepo.addQuestion(question);
        const nextCategories = await deps.questionRepo.listCategories();

        return json(
          {
            question: saved,
            categories: nextCategories
          },
          { status: 201 },
          request,
          deps.uiOrigin
        );
      }

      if (url.pathname === "/api/admin/users" && request.method === "GET") {
        const user = await getCurrentUser(request, deps);
        if (!user || user.role !== "admin") {
          return json({ error: "没有权限。" }, { status: 403 }, request, deps.uiOrigin);
        }

        const users = await deps.userStore.list();
        return json(
          {
            users: users.map(toPublicUser)
          },
          { status: 200 },
          request,
          deps.uiOrigin
        );
      }

      if (url.pathname === "/api/admin/users" && request.method === "POST") {
        const user = await getCurrentUser(request, deps);
        if (!user || user.role !== "admin") {
          return json({ error: "没有权限。" }, { status: 403 }, request, deps.uiOrigin);
        }

        const body = await readJson<CreateUserBody>(request);
        const username = sanitizeText(body?.username);
        const displayName = sanitizeText(body?.displayName);
        const password = sanitizeText(body?.password);
        const role = body?.role === "admin" ? "admin" : "user";

        if (!username || !displayName || !password) {
          return json({ error: "用户名、昵称和密码不能为空。" }, { status: 400 }, request, deps.uiOrigin);
        }

        const existing = await deps.userStore.getByUsername(username);
        if (existing) {
          return json({ error: "用户名已存在。" }, { status: 409 }, request, deps.uiOrigin);
        }

        const passwordHash = await deps.passwordService.hash(password);
        const createdUser = await deps.userStore.create({
          username,
          displayName,
          role,
          passwordHash
        });

        return json(
          {
            user: toPublicUser(createdUser)
          },
          { status: 201 },
          request,
          deps.uiOrigin
        );
      }

      return json({ error: "Not found" }, { status: 404 }, request, deps.uiOrigin);
    }
  };
}

