import type { Category, Question, User } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function request<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {})
    }
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "请求失败");
  }

  return payload;
}

export const api = {
  login(username: string, password: string) {
    return request<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
  },
  logout() {
    return request<void>("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({})
    });
  },
  me() {
    return request<{ user: User | null }>("/api/auth/me");
  },
  categories() {
    return request<{ categories: Category[] }>("/api/categories");
  },
  questions(category: string) {
    return request<{ questions: Question[] }>(
      `/api/questions?category=${encodeURIComponent(category)}`
    );
  },
  myQuestions() {
    return request<{ questions: Question[] }>("/api/me/questions");
  },
  myFavorites() {
    return request<{ questions: Question[] }>("/api/me/favorites");
  },
  addFavorite(questionId: string) {
    return request<{ ok: true }>("/api/me/favorites", {
      method: "POST",
      body: JSON.stringify({ questionId })
    });
  },
  removeFavorite(questionId: string) {
    return request<void>(`/api/me/favorites/${encodeURIComponent(questionId)}`, {
      method: "DELETE"
    });
  },
  createQuestion(input: {
    category: string;
    question: string;
    answer: string;
    authorName?: string;
  }) {
    return request<{ question: Question; categories: Category[] }>("/api/questions", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  listUsers() {
    return request<{ users: User[] }>("/api/admin/users");
  },
  createUser(input: {
    username: string;
    displayName: string;
    password: string;
    role: "admin" | "user";
  }) {
    return request<{ user: User }>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },
  updateUser(
    id: string,
    input: {
      username?: string;
      displayName?: string;
      password?: string;
      role?: "admin" | "user";
    }
  ) {
    return request<{ user: User }>(`/api/admin/users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
  },
  deleteUser(id: string) {
    return request<void>(`/api/admin/users/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
  }
};
