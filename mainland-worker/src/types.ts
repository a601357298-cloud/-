export type UserRole = "admin" | "user";
export type SyncStatus = "pending" | "synced" | "failed";
export type SyncJobStatus = "pending" | "processing" | "failed" | "completed";

export interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

export interface SessionUser {
  userId: string;
  role: UserRole;
}

export interface QuestionRecord {
  id: string;
  category: string;
  question: string;
  answer: string;
  authorName: string;
  createdAt: string;
  createdByUserId: string;
}

export interface StoredQuestionRecord extends QuestionRecord {
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  syncError: string | null;
}

export interface CategoryRecord {
  slug: string;
  name: string;
  order: number;
  isDefault: boolean;
  count: number;
}

export interface CreateCategoryInput {
  slug: string;
  name: string;
  order: number;
  isDefault: boolean;
}

export interface CreateUserInput {
  username: string;
  displayName: string;
  role: UserRole;
  passwordHash: string;
}

export interface UpdateUserInput {
  username?: string;
  displayName?: string;
  role?: UserRole;
  passwordHash?: string;
}

export interface SyncJobRecord {
  id: string;
  jobType: "backup_category";
  targetPath: string;
  payloadJson: string;
  status: SyncJobStatus;
  attemptCount: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserStore {
  getByUsername(username: string): Promise<UserRecord | null>;
  getById(id: string): Promise<UserRecord | null>;
  list(): Promise<UserRecord[]>;
  create(input: CreateUserInput): Promise<UserRecord>;
  update(id: string, input: UpdateUserInput): Promise<UserRecord | null>;
  delete(id: string): Promise<boolean>;
}

export interface QuestionRepo {
  listCategories(): Promise<CategoryRecord[]>;
  getQuestions(category: string): Promise<QuestionRecord[]>;
  addQuestion(input: QuestionRecord): Promise<QuestionRecord>;
}

export interface CategoryStore {
  list(): Promise<CategoryRecord[]>;
  create(input: CreateCategoryInput): Promise<void>;
}

export interface SyncJobStore {
  enqueueCategoryBackup(category: string): Promise<SyncJobRecord>;
  listPending(): Promise<SyncJobRecord[]>;
  markCompleted(id: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
}

export interface GitHubBackupRepo {
  writeCategoryQuestions(category: string, questions: QuestionRecord[]): Promise<void>;
}

export interface PasswordService {
  hash(password: string): Promise<string>;
  verify(password: string, passwordHash: string): Promise<boolean>;
}

export interface SessionService {
  issue(user: SessionUser): Promise<string>;
  read(request: Request): Promise<SessionUser | null>;
  clear(): string;
}

export interface AppDeps {
  userStore: UserStore;
  questionRepo: QuestionRepo;
  syncJobStore?: SyncJobStore;
  gitHubBackupRepo?: GitHubBackupRepo;
  passwordService: PasswordService;
  sessionService: SessionService;
  uiOrigin?: string;
  now?: () => string;
  randomId?: () => string;
}
