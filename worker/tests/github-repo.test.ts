import { describe, expect, test, vi } from "vitest";
import { appendQuestionToGitHub } from "../src/github";

describe("appendQuestionToGitHub", () => {
  test("retries once with a fresh sha when GitHub rejects the first write", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sha: "old-sha",
            content: btoa(JSON.stringify([]))
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ message: "sha does not match latest" }),
          { status: 409 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sha: "new-sha",
            content: btoa(JSON.stringify([]))
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ content: { sha: "done" } }), { status: 200 }));

    const question = {
      id: "q-1",
      category: "python",
      question: "新题目",
      answer: "新答案",
      authorName: "张三",
      createdAt: "2026-04-08T00:00:00.000Z",
      createdByUserId: "u1"
    };

    const result = await appendQuestionToGitHub({
      owner: "a601357298-cloud",
      repo: "-",
      path: "data/questions/python.json",
      token: "secret",
      question,
      fetchImpl: fetchMock
    });

    expect(result.sha).toBe("done");
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
