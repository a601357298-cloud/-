import type { GitHubBackupRepo, QuestionRecord, SyncJobStore, QuestionRepo } from "./types";

interface GitHubContentResponse {
  sha: string;
  content: string;
}

interface GitHubEnv {
  repoFullName: string;
  token: string;
  dataRoot: string;
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
      "user-agent": "mainland-answer-record-site",
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

export class GitHubQuestionBackupRepo implements GitHubBackupRepo {
  constructor(private env: GitHubEnv) {}

  async writeCategoryQuestions(category: string, questions: QuestionRecord[]) {
    const { owner, repo } = splitRepo(this.env.repoFullName);
    const path = `${this.env.dataRoot}/questions/${category}.json`;
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}`;
    const current = await readContentFile(owner, repo, path, this.env.token, this.env.fetchImpl);
    const content = JSON.stringify(questions, null, 2);

    await requestJson<{ content: { sha: string } }>(
      url,
      this.env.token,
      {
        method: "PUT",
        body: JSON.stringify({
          message: `feat(data-mainland): sync category ${category}`,
          content: toBase64(content),
          sha: current.sha
        })
      },
      this.env.fetchImpl
    );
  }
}

export async function syncPendingCategoryBackups(args: {
  syncJobStore: SyncJobStore;
  questionRepo: QuestionRepo;
  gitHubBackupRepo: GitHubBackupRepo;
}) {
  const pendingJobs = await args.syncJobStore.listPending();

  for (const job of pendingJobs) {
    try {
      const payload = JSON.parse(job.payloadJson) as { category: string };
      const questions = await args.questionRepo.getQuestions(payload.category);
      await args.gitHubBackupRepo.writeCategoryQuestions(payload.category, questions);
      await args.syncJobStore.markCompleted(job.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "GitHub sync failed";
      await args.syncJobStore.markFailed(job.id, message);
    }
  }
}
