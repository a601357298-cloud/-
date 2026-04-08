import { createApp } from "./app";
import { createPasswordService } from "./auth/password";
import { createSessionService } from "./auth/session";
import { GitHubQuestionRepo } from "./github";
import { D1UserStore } from "./storage/d1-user-store";

export interface Env {
  DB: D1Database;
  COOKIE_SECRET: string;
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
  UI_ORIGIN: string;
  BOOTSTRAP_ADMIN_USERNAME?: string;
  BOOTSTRAP_ADMIN_DISPLAY_NAME?: string;
  BOOTSTRAP_ADMIN_PASSWORD_HASH?: string;
}

function createRandomId() {
  return crypto.randomUUID();
}

async function ensureBootstrapAdmin(env: Env, userStore: D1UserStore) {
  if (
    !env.BOOTSTRAP_ADMIN_USERNAME ||
    !env.BOOTSTRAP_ADMIN_DISPLAY_NAME ||
    !env.BOOTSTRAP_ADMIN_PASSWORD_HASH
  ) {
    return;
  }

  const existing = await userStore.getByUsername(env.BOOTSTRAP_ADMIN_USERNAME);
  if (existing) {
    return;
  }

  await userStore.create({
    username: env.BOOTSTRAP_ADMIN_USERNAME,
    displayName: env.BOOTSTRAP_ADMIN_DISPLAY_NAME,
    role: "admin",
    passwordHash: env.BOOTSTRAP_ADMIN_PASSWORD_HASH
  });
}

export default {
  async fetch(request: Request, env: Env) {
    const now = () => new Date().toISOString();
    const userStore = new D1UserStore(env.DB, now, createRandomId);
    await ensureBootstrapAdmin(env, userStore);

    const app = createApp({
      userStore,
      questionRepo: new GitHubQuestionRepo({
        repoFullName: env.GITHUB_REPO,
        token: env.GITHUB_TOKEN
      }),
      passwordService: createPasswordService(),
      sessionService: createSessionService(env.COOKIE_SECRET),
      uiOrigin: env.UI_ORIGIN,
      now,
      randomId: createRandomId
    });

    return app.fetch(request);
  }
};

