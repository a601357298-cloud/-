import { describe, expect, test } from "vitest";
import { D1CategoryStore, D1QuestionRepo, D1SyncJobStore, D1UserStore } from "../src/database";
import type { CreateUserInput, QuestionRecord, SyncJobRecord, UserRecord, UserRole } from "../src/types";

type BoundValue = string | number | null;

class FakeD1PreparedStatement {
  constructor(
    private database: FakeD1Database,
    private sql: string,
    private params: BoundValue[] = []
  ) {}

  bind(...params: BoundValue[]) {
    return new FakeD1PreparedStatement(this.database, this.sql, params);
  }

  async first<T>() {
    return this.database.first<T>(this.sql, this.params);
  }

  async all<T>() {
    return this.database.all<T>(this.sql, this.params);
  }

  async run() {
    return this.database.run(this.sql, this.params);
  }
}

class FakeD1Database {
  users: UserRecord[] = [];
  categories: Array<{ slug: string; name: string; order: number; isDefault: boolean; createdAt: string }> = [];
  questions: Array<QuestionRecord & { syncStatus: string; lastSyncedAt: string | null; syncError: string | null }> = [];
  syncJobs: SyncJobRecord[] = [];
  favorites: Array<{ userId: string; questionId: string; createdAt: string }> = [];

  prepare(sql: string) {
    return new FakeD1PreparedStatement(this, sql);
  }

  async first<T>(sql: string, params: BoundValue[]) {
    if (sql.includes("FROM users") && sql.includes("WHERE username = ?1")) {
      return (this.users.find((row) => row.username === params[0]) ?? null) as T | null;
    }

    if (sql.includes("FROM users") && sql.includes("WHERE id = ?1")) {
      return (this.users.find((row) => row.id === params[0]) ?? null) as T | null;
    }

    if (sql.includes("SELECT id FROM questions WHERE id = ?1")) {
      const question = this.questions.find((row) => row.id === params[0]);
      return (question ? { id: question.id } : null) as T | null;
    }

    return null;
  }

  async all<T>(sql: string, params: BoundValue[]) {
    if (sql.includes("FROM users")) {
      return { results: [...this.users] as T[] };
    }

    if (sql.includes("FROM categories")) {
      return {
        results: this.categories
          .map((category) => ({
            slug: category.slug,
            name: category.name,
            order: category.order,
            isDefault: category.isDefault ? 1 : 0,
            count: this.questions.filter((question) => question.category === category.slug).length
          })) as T[]
      };
    }

    if (sql.includes("FROM question_favorites fav") && sql.includes("INNER JOIN questions q")) {
      const userId = String(params[0]);
      return {
        results: this.favorites
          .filter((favorite) => favorite.userId === userId)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
          .map((favorite) => this.questions.find((question) => question.id === favorite.questionId))
          .filter((question): question is NonNullable<typeof question> => Boolean(question))
          .map((question) => ({
            id: question.id,
            category: question.category,
            question: question.question,
            answer: question.answer,
            authorName: question.authorName,
            createdAt: question.createdAt,
            createdByUserId: question.createdByUserId,
            isFavorite: 1,
            syncStatus: question.syncStatus,
            lastSyncedAt: question.lastSyncedAt,
            syncError: question.syncError
          })) as T[]
      };
    }

    if (sql.includes("FROM questions") && sql.includes("WHERE created_by_user_id = ?1")) {
      const userId = String(params[0]);
      return {
        results: this.questions
          .filter((question) => question.createdByUserId === userId)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
          .map((question) => ({
            id: question.id,
            category: question.category,
            question: question.question,
            answer: question.answer,
            authorName: question.authorName,
            createdAt: question.createdAt,
            createdByUserId: question.createdByUserId,
            isFavorite: 0,
            syncStatus: question.syncStatus,
            lastSyncedAt: question.lastSyncedAt,
            syncError: question.syncError
          })) as T[]
      };
    }

    if (sql.includes("FROM questions")) {
      const category = String(params[0]);
      const viewerUserId = params[1] ? String(params[1]) : null;
      return {
        results: this.questions
          .filter((question) => question.category === category)
          .map((question) => ({
            id: question.id,
            category: question.category,
            question: question.question,
            answer: question.answer,
            authorName: question.authorName,
            createdAt: question.createdAt,
            createdByUserId: question.createdByUserId,
            isFavorite:
              viewerUserId &&
              this.favorites.some(
                (favorite) => favorite.userId === viewerUserId && favorite.questionId === question.id
              )
                ? 1
                : 0,
            syncStatus: question.syncStatus,
            lastSyncedAt: question.lastSyncedAt,
            syncError: question.syncError
          })) as T[]
      };
    }

    if (sql.includes("FROM sync_jobs")) {
      return { results: [...this.syncJobs] as T[] };
    }

    return { results: [] as T[] };
  }

  async run(sql: string, params: BoundValue[]) {
    if (sql.startsWith("INSERT INTO users")) {
      this.users.push({
        id: String(params[0]),
        username: String(params[1]),
        displayName: String(params[2]),
        role: params[3] as UserRole,
        passwordHash: String(params[4]),
        createdAt: String(params[5])
      });
      return { success: true, meta: { changes: 1 } };
    }

    if (sql.startsWith("UPDATE users")) {
      const user = this.users.find((item) => item.id === params[4]);
      if (!user) {
        return { success: true, meta: { changes: 0 } };
      }
      user.username = String(params[0]);
      user.displayName = String(params[1]);
      user.role = params[2] as UserRole;
      user.passwordHash = String(params[3]);
      return { success: true, meta: { changes: 1 } };
    }

    if (sql.startsWith("DELETE FROM users")) {
      const before = this.users.length;
      this.users = this.users.filter((item) => item.id !== params[0]);
      return { success: true, meta: { changes: before - this.users.length } };
    }

    if (sql.startsWith("INSERT INTO categories")) {
      this.categories.push({
        slug: String(params[0]),
        name: String(params[1]),
        order: Number(params[2]),
        isDefault: Number(params[3]) === 1,
        createdAt: String(params[4])
      });
      return { success: true, meta: { changes: 1 } };
    }

    if (sql.startsWith("INSERT INTO questions")) {
      this.questions.push({
        id: String(params[0]),
        category: String(params[1]),
        question: String(params[2]),
        answer: String(params[3]),
        authorName: String(params[4]),
        createdByUserId: String(params[5]),
        createdAt: String(params[6]),
        syncStatus: "pending",
        lastSyncedAt: null,
        syncError: null
      });
      return { success: true, meta: { changes: 1 } };
    }

    if (sql.startsWith("INSERT INTO sync_jobs")) {
      this.syncJobs.push({
        id: String(params[0]),
        jobType: "backup_category",
        targetPath: String(params[2]),
        payloadJson: String(params[3]),
        status: "pending",
        attemptCount: Number(params[5]),
        lastError: params[6] === null ? null : String(params[6]),
        createdAt: String(params[7]),
        updatedAt: String(params[8])
      });
      return { success: true, meta: { changes: 1 } };
    }

    if (sql.startsWith("INSERT OR IGNORE INTO question_favorites")) {
      const existing = this.favorites.find(
        (item) => item.userId === params[0] && item.questionId === params[1]
      );
      if (existing) {
        return { success: true, meta: { changes: 0 } };
      }

      this.favorites.push({
        userId: String(params[0]),
        questionId: String(params[1]),
        createdAt: String(params[2])
      });
      return { success: true, meta: { changes: 1 } };
    }

    if (sql.startsWith("DELETE FROM question_favorites")) {
      const before = this.favorites.length;
      this.favorites = this.favorites.filter(
        (item) => !(item.userId === params[0] && item.questionId === params[1])
      );
      return { success: true, meta: { changes: before - this.favorites.length } };
    }

    return { success: true, meta: { changes: 0 } };
  }
}

function createRepos() {
  const db = new FakeD1Database();
  const now = () => "2026-04-09T00:00:00.000Z";
  const randomId = () => `id-${db.syncJobs.length + db.users.length + 1}`;
  const userStore = new D1UserStore(db as unknown as D1Database, now, randomId);
  const categoryStore = new D1CategoryStore(db as unknown as D1Database, now);
  const syncJobStore = new D1SyncJobStore(db as unknown as D1Database, now, randomId);
  const questionRepo = new D1QuestionRepo(db as unknown as D1Database, categoryStore, syncJobStore, now);
  return { db, userStore, categoryStore, syncJobStore, questionRepo };
}

describe("mainland D1 repositories", () => {
  test("creates and reads users from D1", async () => {
    const { userStore } = createRepos();
    const input: CreateUserInput = {
      username: "yun",
      displayName: "大脸猫",
      role: "user",
      passwordHash: "hashed:123456"
    };

    await userStore.create(input);
    const found = await userStore.getByUsername("yun");

    expect(found).toMatchObject({
      username: "yun",
      displayName: "大脸猫"
    });
  });

  test("adds a question and creates a pending category backup job", async () => {
    const { db, categoryStore, questionRepo } = createRepos();
    await categoryStore.create({
      slug: "python",
      name: "Python",
      order: 1,
      isDefault: true
    });

    const question: QuestionRecord = {
      id: "q-1",
      category: "python",
      question: "新题",
      answer: "新答案",
      authorName: "管理员",
      createdAt: "2026-04-09T00:00:00.000Z",
      createdByUserId: "admin-1"
    };

    await questionRepo.addQuestion(question);
    const categories = await questionRepo.listCategories();
    const questions = await questionRepo.getQuestions("python");

    expect(categories).toMatchObject([{ slug: "python", count: 1 }]);
    expect(questions).toMatchObject([{ question: "新题" }]);
    expect(db.syncJobs).toHaveLength(1);
    expect(db.syncJobs[0]).toMatchObject({
      status: "pending",
      targetPath: "questions/python.json"
    });
  });

  test("stores favorites and reflects them in question queries", async () => {
    const { categoryStore, questionRepo } = createRepos();
    await categoryStore.create({
      slug: "python",
      name: "Python",
      order: 1,
      isDefault: true
    });

    await questionRepo.addQuestion({
      id: "q-1",
      category: "python",
      question: "收藏题",
      answer: "答案",
      authorName: "管理员",
      createdAt: "2026-04-09T00:00:00.000Z",
      createdByUserId: "admin-1"
    });

    await questionRepo.addFavorite("user-1", "q-1");

    const categoryQuestions = await questionRepo.getQuestions("python", "user-1");
    const favoriteQuestions = await questionRepo.getFavoriteQuestions("user-1");

    expect(categoryQuestions).toMatchObject([{ id: "q-1", isFavorite: true }]);
    expect(favoriteQuestions).toMatchObject([{ id: "q-1", question: "收藏题" }]);

    await questionRepo.removeFavorite("user-1", "q-1");
    const afterRemove = await questionRepo.getQuestions("python", "user-1");
    expect(afterRemove).toMatchObject([{ id: "q-1", isFavorite: false }]);
  });
});
