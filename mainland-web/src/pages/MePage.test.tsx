import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { App } from "../App";

vi.mock("../auth/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: {
      id: "user-1",
      username: "yun",
      displayName: "大脸猫的忠实粉丝",
      role: "user",
      createdAt: "2026-04-09T00:00:00.000Z"
    },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn()
  })
}));

vi.mock("../lib/api", () => ({
  api: {
    me: vi.fn(),
    myQuestions: vi.fn(async () => ({
      questions: [
        {
          id: "q-uploaded",
          category: "python",
          question: "我上传的题目",
          answer: "我的答案",
          authorName: "大脸猫的忠实粉丝",
          createdAt: "2026-04-09T00:00:00.000Z",
          createdByUserId: "user-1",
          isFavorite: false
        }
      ]
    })),
    myFavorites: vi.fn(async () => ({
      questions: [
        {
          id: "q-favorite",
          category: "oracle",
          question: "我收藏的题目",
          answer: "收藏答案",
          authorName: "管理员",
          createdAt: "2026-04-09T00:00:00.000Z",
          createdByUserId: "admin-1",
          isFavorite: true
        }
      ]
    }))
  }
}));

describe("Me page", () => {
  test("shows my uploaded questions and my favorite questions", async () => {
    window.history.replaceState({}, "", "/#/me");

    render(<App />);

    expect(await screen.findByRole("heading", { name: "我上传的题目" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "我收藏的题目" })).toBeInTheDocument();
    expect(screen.getByText("我上传的题目", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("我收藏的题目", { selector: "strong" })).toBeInTheDocument();
  });
});
