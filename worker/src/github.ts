import type {
  CategoryFileRecord,
  CategoryRecord,
  QuestionRecord,
  QuestionRepo
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

async function readJsonFile<T>(
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

function questionPath(slug: string) {
  return `data/questions/${slug}.json`;
}

export class GitHubQuestionRepo implements QuestionRepo {
  constructor(private env: GitHubEnv) {}

  async listCategories(): Promise<CategoryRecord[]> {
    const { data: categories } = await readJsonFile<CategoryFileRecord[]>(
      this.env,
      "data/categories.json"
    );

    const questionsByCategory = await Promise.all(
      categories.map(async (category) => {
        const { data } = await readJsonFile<QuestionRecord[]>(this.env, questionPath(category.slug));
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
    const { data } = await readJsonFile<QuestionRecord[]>(this.env, questionPath(category));
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
