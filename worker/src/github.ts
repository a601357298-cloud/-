import type {
  CategoryFileRecord,
  CategoryRecord,
  CreateUserInput,
  QuestionRecord,
  QuestionRepo,
  UpdateUserInput,
  UserRecord,
  UserStore
} from "./types";

interface GitHubContentResponse {
  sha: string;
  content: string;
}

interface AppendQuestionArgs {
  owner: string;
  repo: string;
  path: string;
  token: string;
  question: QuestionRecord;
  fetchImpl?: typeof fetch;
}

interface GitHubEnv {
  repoFullName: string;
  token: string;
  fetchImpl?: typeof fetch;
}

function splitRepo(fullName: string) {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid GitHub repo: ${fullName}`);
  }
  return { owner, repo };
}

function toBase64(text: string) {
  return btoa(unescape(encodeURIComponent(text)));
}

function fromBase64(value: string) {
  const normalized = value.replace(/\n/g, "");
  return decodeURIComponent(escape(atob(normalized)));
}

async function requestJson<T>(
  url: string,
  token: string,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch
) {
  const response = await fetchImpl(url, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "user-agent": "answer-record-site",
      ...(init.headers ?? {})
    }
  });

  const payload = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    const error = new Error(payload.message ?? `GitHub request failed with ${response.status}`);
    Object.assign(error, { status: response.status });
    throw error;
  }

  return payload;
}

async function readContentFile(
  owner: string,
  repo: string,
  path: string,
  token: string,
  fetchImpl: typeof fetch = fetch
) {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`;
  const payload = await requestJson<GitHubContentResponse>(url, token, {}, fetchImpl);
  return {
    sha: payload.sha,
    text: fromBase64(payload.content)
  };
}

async function updateJsonFile<T>(
  owner: string,
  repo: string,
  path: string,
  token: string,
  update: (current: T) => T,
  fetchImpl: typeof fetch = fetch,
  message = `chore(data): update ${path}`
) {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`;

  let attempts = 0;
  while (attempts < 2) {
    attempts += 1;
    const current = await readContentFile(owner, repo, path, token, fetchImpl);
    const nextData = update(JSON.parse(current.text) as T);
    const nextText = JSON.stringify(nextData, null, 2);

    const response = await fetchImpl(url, {
      method: "PUT",
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "user-agent": "answer-record-site"
      },
      body: JSON.stringify({
        message,
        content: toBase64(nextText),
        sha: current.sha
      })
    });

    const payload = (await response.json()) as { content?: { sha: string }; message?: string };
    if (response.ok && payload.content?.sha) {
      return {
        sha: payload.content.sha,
        data: nextData
      };
    }

    if (response.status !== 409 && response.status !== 422) {
      throw new Error(payload.message ?? `GitHub update failed with ${response.status}`);
    }
  }

  throw new Error("GitHub update failed after retry");
}

export async function appendQuestionToGitHub(args: AppendQuestionArgs) {
  const fetchImpl = args.fetchImpl ?? fetch;
  const url = `https://api.github.com/repos/${encodeURIComponent(args.owner)}/${encodeURIComponent(args.repo)}/contents/${args.path}`;

  let attempts = 0;
  while (attempts < 2) {
    attempts += 1;
    const current = await readContentFile(args.owner, args.repo, args.path, args.token, fetchImpl);
    const questions = JSON.parse(current.text) as QuestionRecord[];
    const nextText = JSON.stringify([...questions, args.question], null, 2);

    const response = await fetchImpl(url, {
      method: "PUT",
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${args.token}`,
        "content-type": "application/json",
        "user-agent": "answer-record-site"
      },
      body: JSON.stringify({
        message: `feat(data): add question ${args.question.id}`,
        content: toBase64(nextText),
        sha: current.sha
      })
    });

    const payload = (await response.json()) as { content?: { sha: string }; message?: string };
    if (response.ok && payload.content?.sha) {
      return { sha: payload.content.sha };
    }

    if (response.status !== 409 && response.status !== 422) {
      throw new Error(payload.message ?? `GitHub update failed with ${response.status}`);
    }
  }

  throw new Error("GitHub update failed after retry");
}

export async function readJsonFileFromGitHub<T>(
  env: GitHubEnv,
  path: string
): Promise<{ sha: string; data: T }> {
  const { owner, repo } = splitRepo(env.repoFullName);
  const content = await readContentFile(owner, repo, path, env.token, env.fetchImpl);
  return {
    sha: content.sha,
    data: JSON.parse(content.text) as T
  };
}

export async function updateJsonFileInGitHub<T>(
  env: GitHubEnv,
  path: string,
  update: (current: T) => T,
  message?: string
) {
  const { owner, repo } = splitRepo(env.repoFullName);
  return updateJsonFile(owner, repo, path, env.token, update, env.fetchImpl, message);
}

function questionPath(slug: string) {
  return `data/questions/${slug}.json`;
}

export class GitHubQuestionRepo implements QuestionRepo {
  constructor(private env: GitHubEnv) {}

  async listCategories(): Promise<CategoryRecord[]> {
    const { data: categories } = await readJsonFileFromGitHub<CategoryFileRecord[]>(
      this.env,
      "data/categories.json"
    );

    const questionsByCategory = await Promise.all(
      categories.map(async (category) => {
        const { data } = await readJsonFileFromGitHub<QuestionRecord[]>(this.env, questionPath(category.slug));
        return {
          slug: category.slug,
          count: data.length
        };
      })
    );

    return categories
      .map((category) => ({
        ...category,
        count: questionsByCategory.find((entry) => entry.slug === category.slug)?.count ?? 0
      }))
      .sort((left, right) => left.order - right.order);
  }

  async getQuestions(category: string) {
    const { data } = await readJsonFileFromGitHub<QuestionRecord[]>(this.env, questionPath(category));
    return data;
  }

  async addQuestion(input: QuestionRecord) {
    const { owner, repo } = splitRepo(this.env.repoFullName);
    await appendQuestionToGitHub({
      owner,
      repo,
      path: questionPath(input.category),
      token: this.env.token,
      question: input,
      fetchImpl: this.env.fetchImpl
    });
    return input;
  }
}

const USERS_PATH = "data/users.json";

export class GitHubUserStore implements UserStore {
  constructor(
    private env: GitHubEnv,
    private now: () => string,
    private randomId: () => string
  ) {}

  async getByUsername(username: string) {
    const users = await this.list();
    return users.find((user) => user.username === username) ?? null;
  }

  async getById(id: string) {
    const users = await this.list();
    return users.find((user) => user.id === id) ?? null;
  }

  async list() {
    const { data } = await readJsonFileFromGitHub<UserRecord[]>(this.env, USERS_PATH);
    return data;
  }

  async create(input: CreateUserInput) {
    const user: UserRecord = {
      id: this.randomId(),
      createdAt: this.now(),
      ...input
    };

    await updateJsonFileInGitHub<UserRecord[]>(
      this.env,
      USERS_PATH,
      (current) => [...current, user],
      `feat(data): add user ${user.username}`
    );

    return user;
  }

  async update(id: string, input: UpdateUserInput) {
    const result = await updateJsonFileInGitHub<UserRecord[]>(
      this.env,
      USERS_PATH,
      (current) =>
        current.map((user) => (user.id === id ? { ...user, ...input } : user)),
      `feat(data): update user ${id}`
    );

    return result.data.find((user) => user.id === id) ?? null;
  }

  async delete(id: string) {
    let removed = false;

    await updateJsonFileInGitHub<UserRecord[]>(
      this.env,
      USERS_PATH,
      (current) => {
        const next = current.filter((user) => user.id !== id);
        removed = next.length !== current.length;
        return next;
      },
      `feat(data): delete user ${id}`
    );

    return removed;
  }
}
