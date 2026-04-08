export type UserRole = "admin" | "user";

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

export interface CategoryRecord {
  slug: string;
  name: string;
  order: number;
  isDefault: boolean;
  count: number;
}

export interface CategoryFileRecord {
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

export interface CreateQuestionInput {
  category: string;
  question: string;
  answer: string;
  authorName: string;
  createdByUserId: string;
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
  passwordService: PasswordService;
  sessionService: SessionService;
  uiOrigin?: string;
  now?: () => string;
  randomId?: () => string;
}
