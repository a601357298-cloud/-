import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { StudyDeck } from "./StudyDeck";

const questions = [
  {
    id: "q1",
    category: "python",
    question: "什么是浅拷贝？",
    answer: "浅拷贝只复制第一层。",
    authorName: "张三",
    createdAt: "2026-04-08T00:00:00.000Z",
    createdByUserId: "u1"
  },
  {
    id: "q2",
    category: "python",
    question: "什么是深拷贝？",
    answer: "深拷贝会递归复制。",
    authorName: "李四",
    createdAt: "2026-04-08T00:00:00.000Z",
    createdByUserId: "u2"
  }
];

describe("StudyDeck", () => {
  test("flips the card and resets to the question face after navigating", async () => {
    const user = userEvent.setup();

    render(
      <StudyDeck
        categoryName="Python"
        questions={questions}
        initialOrder={questions.map((question) => question.id)}
      />
    );

    expect(screen.getByText("什么是浅拷贝？")).toBeInTheDocument();
    expect(screen.queryByText("浅拷贝只复制第一层。")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /点击翻面/i }));
    expect(screen.getByText("浅拷贝只复制第一层。")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /下一题/i }));
    expect(screen.getByText("什么是深拷贝？")).toBeInTheDocument();
    expect(screen.queryByText("深拷贝会递归复制。")).not.toBeInTheDocument();
  });

  test("shows a favorite action for the current card and calls back when clicked", async () => {
    const user = userEvent.setup();
    const favoriteEvents: string[] = [];

    const view = render(
      <StudyDeck
        categoryName="Python"
        questions={questions}
        initialOrder={questions.map((question) => question.id)}
        {...({
          isAuthenticated: true,
          onToggleFavorite: async (questionId: string) => {
            favoriteEvents.push(questionId);
          }
        } as Record<string, unknown>)}
      />
    );

    await user.click(within(view.container).getByRole("button", { name: "收藏" }));
    expect(favoriteEvents).toEqual(["q1"]);
  });
});
