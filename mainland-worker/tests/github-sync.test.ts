import { describe, expect, test } from "vitest";
import { syncPendingCategoryBackups } from "../src/github";
import type { GitHubBackupRepo, QuestionRecord, SyncJobRecord, SyncJobStore, QuestionRepo } from "../src/types";

function createHarness() {
  const completed: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];
  const writes: Array<{ category: string; questions: QuestionRecord[] }> = [];

  const syncJobStore: SyncJobStore = {
    async enqueueCategoryBackup() {
      throw new Error("not used in this test");
    },
    async listPending() {
      return [
        {
          id: "job-1",
          jobType: "backup_category",
          targetPath: "questions/python.json",
          payloadJson: JSON.stringify({ category: "python" }),
          status: "pending",
          attemptCount: 0,
          lastError: null,
          createdAt: "2026-04-09T00:00:00.000Z",
          updatedAt: "2026-04-09T00:00:00.000Z"
        } satisfies SyncJobRecord
      ];
    },
    async markCompleted(id: string) {
      completed.push(id);
    },
    async markFailed(id: string, error: string) {
      failed.push({ id, error });
    }
  };

  const questionRepo: QuestionRepo = {
    async listCategories() {
      return [];
    },
    async getQuestions() {
      return [
        {
          id: "q-1",
          category: "python",
          question: "题目",
          answer: "答案",
          authorName: "管理员",
          createdAt: "2026-04-09T00:00:00.000Z",
          createdByUserId: "admin-1"
        }
      ];
    },
    async addQuestion(input: QuestionRecord) {
      return input;
    }
  };

  const gitHubBackupRepo: GitHubBackupRepo = {
    async writeCategoryQuestions(category: string, questions: QuestionRecord[]) {
      writes.push({ category, questions });
    }
  };

  return { syncJobStore, questionRepo, gitHubBackupRepo, completed, failed, writes };
}

describe("mainland GitHub sync", () => {
  test("marks a pending category backup as completed after a successful GitHub write", async () => {
    const harness = createHarness();

    await syncPendingCategoryBackups({
      syncJobStore: harness.syncJobStore,
      questionRepo: harness.questionRepo,
      gitHubBackupRepo: harness.gitHubBackupRepo
    });

    expect(harness.writes).toHaveLength(1);
    expect(harness.writes[0]).toMatchObject({
      category: "python"
    });
    expect(harness.completed).toEqual(["job-1"]);
    expect(harness.failed).toEqual([]);
  });
});
