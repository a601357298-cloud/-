import type {
  CategoryRecord,
  CreateCategoryInput,
  CreateUserInput,
  QuestionRecord,
  StoredQuestionRecord,
  SyncJobRecord,
  SyncJobStore,
  UpdateUserInput,
  UserRecord,
  UserStore,
  QuestionRepo
} from "./types";

interface UserRow {
  id: string;
  username: string;
  displayName: string;
  role: UserRecord["role"];
  passwordHash: string;
  createdAt: string;
}

interface CategoryRow {
  slug: string;
  name: string;
  order: number;
  isDefault: number;
  count: number;
}

interface QuestionRow {
  id: string;
  category: string;
  question: string;
  answer: string;
  authorName: string;
  createdAt: string;
  createdByUserId: string;
  syncStatus: StoredQuestionRecord["syncStatus"];
  lastSyncedAt: string | null;
  syncError: string | null;
}

interface SyncJobRow {
  id: string;
  jobType: "backup_category";
  targetPath: string;
  payloadJson: string;
  status: SyncJobRecord["status"];
  attemptCount: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

function toUserRecord(row: UserRow | null) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    role: row.role,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt
  } satisfies UserRecord;
}

function toCategoryRecord(row: CategoryRow): CategoryRecord {
  return {
    slug: row.slug,
    name: row.name,
    order: row.order,
    isDefault: Boolean(row.isDefault),
    count: row.count
  };
}

function toQuestionRecord(row: QuestionRow): QuestionRecord {
  return {
    id: row.id,
    category: row.category,
    question: row.question,
    answer: row.answer,
    authorName: row.authorName,
    createdAt: row.createdAt,
    createdByUserId: row.createdByUserId
  };
}

export class D1UserStore implements UserStore {
  constructor(
    private db: D1Database,
    private now: () => string,
    private randomId: () => string
  ) {}

  async getByUsername(username: string) {
    const row = await this.db
      .prepare(
        `SELECT
          id,
          username,
          display_name AS displayName,
          role,
          password_hash AS passwordHash,
          created_at AS createdAt
        FROM users
        WHERE username = ?1
        LIMIT 1`
      )
      .bind(username)
      .first<UserRow>();

    return toUserRecord(row ?? null);
  }

  async getById(id: string) {
    const row = await this.db
      .prepare(
        `SELECT
          id,
          username,
          display_name AS displayName,
          role,
          password_hash AS passwordHash,
          created_at AS createdAt
        FROM users
        WHERE id = ?1
        LIMIT 1`
      )
      .bind(id)
      .first<UserRow>();

    return toUserRecord(row ?? null);
  }

  async list() {
    const result = await this.db
      .prepare(
        `SELECT
          id,
          username,
          display_name AS displayName,
          role,
          password_hash AS passwordHash,
          created_at AS createdAt
        FROM users
        ORDER BY created_at ASC`
      )
      .all<UserRow>();

    return result.results.map((row) => toUserRecord(row)).filter((row): row is UserRecord => row !== null);
  }

  async create(input: CreateUserInput) {
    const user: UserRecord = {
      id: this.randomId(),
      createdAt: this.now(),
      ...input
    };

    await this.db
      .prepare(
        `INSERT INTO users (id, username, display_name, role, password_hash, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
      )
      .bind(user.id, user.username, user.displayName, user.role, user.passwordHash, user.createdAt)
      .run();

    return user;
  }

  async update(id: string, input: UpdateUserInput) {
    const current = await this.getById(id);
    if (!current) {
      return null;
    }

    const next: UserRecord = { ...current, ...input };
    await this.db
      .prepare(
        `UPDATE users
        SET username = ?1,
            display_name = ?2,
            role = ?3,
            password_hash = ?4
        WHERE id = ?5`
      )
      .bind(next.username, next.displayName, next.role, next.passwordHash, id)
      .run();

    return next;
  }

  async delete(id: string) {
    const result = await this.db.prepare("DELETE FROM users WHERE id = ?1").bind(id).run();
    return Boolean(result.meta?.changes);
  }
}

export class D1CategoryStore {
  constructor(private db: D1Database, private now: () => string) {}

  async list() {
    const result = await this.db
      .prepare(
        `SELECT
          c.slug,
          c.name,
          c.sort_order AS "order",
          c.is_default AS isDefault,
          COUNT(q.id) AS count
        FROM categories c
        LEFT JOIN questions q ON q.category_slug = c.slug
        GROUP BY c.slug, c.name, c.sort_order, c.is_default
        ORDER BY c.sort_order ASC`
      )
      .all<CategoryRow>();

    return result.results.map(toCategoryRecord);
  }

  async create(input: CreateCategoryInput) {
    await this.db
      .prepare(
        `INSERT INTO categories (slug, name, sort_order, is_default, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5)`
      )
      .bind(input.slug, input.name, input.order, input.isDefault ? 1 : 0, this.now())
      .run();
  }
}

export class D1SyncJobStore implements SyncJobStore {
  constructor(
    private db: D1Database,
    private now: () => string,
    private randomId: () => string
  ) {}

  async enqueueCategoryBackup(category: string) {
    const job: SyncJobRecord = {
      id: this.randomId(),
      jobType: "backup_category",
      targetPath: `questions/${category}.json`,
      payloadJson: JSON.stringify({ category }),
      status: "pending",
      attemptCount: 0,
      lastError: null,
      createdAt: this.now(),
      updatedAt: this.now()
    };

    await this.db
      .prepare(
        `INSERT INTO sync_jobs (
          id,
          job_type,
          target_path,
          payload_json,
          status,
          attempt_count,
          last_error,
          created_at,
          updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
      )
      .bind(
        job.id,
        job.jobType,
        job.targetPath,
        job.payloadJson,
        job.status,
        job.attemptCount,
        job.lastError,
        job.createdAt,
        job.updatedAt
      )
      .run();

    return job;
  }

  async listPending() {
    const result = await this.db
      .prepare(
        `SELECT
          id,
          job_type AS jobType,
          target_path AS targetPath,
          payload_json AS payloadJson,
          status,
          attempt_count AS attemptCount,
          last_error AS lastError,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM sync_jobs
        WHERE status IN ('pending', 'failed')
        ORDER BY created_at ASC`
      )
      .all<SyncJobRow>();

    return result.results;
  }

  async markCompleted(id: string) {
    await this.db
      .prepare(
        `UPDATE sync_jobs
        SET status = 'completed',
            updated_at = ?2
        WHERE id = ?1`
      )
      .bind(id, this.now())
      .run();
  }

  async markFailed(id: string, error: string) {
    await this.db
      .prepare(
        `UPDATE sync_jobs
        SET status = 'failed',
            attempt_count = attempt_count + 1,
            last_error = ?2,
            updated_at = ?3
        WHERE id = ?1`
      )
      .bind(id, error, this.now())
      .run();
  }
}

export class D1QuestionRepo implements QuestionRepo {
  constructor(
    private db: D1Database,
    private categoryStore: D1CategoryStore,
    private syncJobStore: D1SyncJobStore
  ) {}

  async listCategories() {
    return this.categoryStore.list();
  }

  async getQuestions(category: string) {
    const result = await this.db
      .prepare(
        `SELECT
          id,
          category_slug AS category,
          question,
          answer,
          author_name AS authorName,
          created_at AS createdAt,
          created_by_user_id AS createdByUserId,
          sync_status AS syncStatus,
          last_synced_at AS lastSyncedAt,
          sync_error AS syncError
        FROM questions
        WHERE category_slug = ?1
        ORDER BY created_at ASC`
      )
      .bind(category)
      .all<QuestionRow>();

    return result.results.map(toQuestionRecord);
  }

  async addQuestion(input: QuestionRecord) {
    await this.db
      .prepare(
        `INSERT INTO questions (
          id,
          category_slug,
          question,
          answer,
          author_name,
          created_by_user_id,
          created_at,
          sync_status,
          last_synced_at,
          sync_error
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending', NULL, NULL)`
      )
      .bind(
        input.id,
        input.category,
        input.question,
        input.answer,
        input.authorName,
        input.createdByUserId,
        input.createdAt
      )
      .run();

    await this.syncJobStore.enqueueCategoryBackup(input.category);
    return input;
  }
}
