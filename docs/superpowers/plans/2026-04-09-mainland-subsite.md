# Mainland Subsite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new `/mainland/` subsite in the same repository that keeps the current UI/UX but uses independent D1-backed data and GitHub as asynchronous backup only.

**Architecture:** Add a second frontend app under `mainland-web/` with the same interaction model as the current site and a second Worker under `mainland-worker/`. The new Worker reads and writes mainland data from a dedicated D1 database, records GitHub backup jobs in D1, and exposes separate auth/question/admin APIs for the new subsite.

**Tech Stack:** React, Vite, TypeScript, React Router, Cloudflare Workers, Cloudflare D1, Vitest, GitHub Pages

---

### Task 1: Scaffold the mainland frontend app

**Files:**
- Create: `mainland-web/package.json`
- Create: `mainland-web/tsconfig.json`
- Create: `mainland-web/vite.config.ts`
- Create: `mainland-web/index.html`
- Create: `mainland-web/src/main.tsx`
- Create: `mainland-web/src/App.tsx`
- Create: `mainland-web/src/styles.css`
- Test: `mainland-web/src/smoke.test.tsx`
- Modify: `package.json`

- [ ] **Step 1: Write the failing smoke test**

```tsx
import { render, screen } from "@testing-library/react";
import { App } from "./App";

test("renders mainland site shell", () => {
  render(<App />);
  expect(screen.getByText("QUESTION FLOW")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w mainland-web`
Expected: FAIL because `mainland-web/` and `App` do not exist yet.

- [ ] **Step 3: Write the minimal mainland app scaffold**

```tsx
export function App() {
  return <div>QUESTION FLOW</div>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w mainland-web`
Expected: PASS

### Task 2: Scaffold the mainland Worker and D1 schema

**Files:**
- Create: `mainland-worker/package.json`
- Create: `mainland-worker/tsconfig.json`
- Create: `mainland-worker/vitest.config.ts`
- Create: `mainland-worker/wrangler.jsonc`
- Create: `mainland-worker/src/index.ts`
- Create: `mainland-worker/src/types.ts`
- Create: `mainland-worker/src/http.ts`
- Create: `mainland-worker/src/auth/password.ts`
- Create: `mainland-worker/src/auth/session.ts`
- Create: `mainland-worker/migrations/0001_mainland_schema.sql`
- Test: `mainland-worker/tests/schema-smoke.test.ts`

- [ ] **Step 1: Write the failing schema/config test**

```ts
import { readFileSync } from "node:fs";

test("mainland worker binds a D1 database", () => {
  const config = readFileSync("wrangler.jsonc", "utf8");
  expect(config).toContain("\"binding\": \"DB\"");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w mainland-worker`
Expected: FAIL because `mainland-worker/` does not exist.

- [ ] **Step 3: Add the worker scaffold and schema migration**

```sql
CREATE TABLE users (...);
CREATE TABLE categories (...);
CREATE TABLE questions (...);
CREATE TABLE sync_jobs (...);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w mainland-worker`
Expected: PASS

### Task 3: Implement D1 repositories and the mainland API

**Files:**
- Create: `mainland-worker/src/database.ts`
- Create: `mainland-worker/src/app.ts`
- Create: `mainland-worker/tests/app.test.ts`
- Create: `mainland-worker/tests/d1-repos.test.ts`

- [ ] **Step 1: Write the failing API tests**

```ts
test("returns categories and questions from D1", async () => {
  const response = await app.fetch(new Request("https://worker.example/api/categories"));
  expect(response.status).toBe(200);
});

test("creates a question in D1 and marks it pending sync", async () => {
  const response = await app.fetch(uploadRequest);
  expect(response.status).toBe(201);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w mainland-worker -- app d1-repos`
Expected: FAIL because the mainland repos and API handlers do not exist yet.

- [ ] **Step 3: Implement the D1-backed repos and API**

```ts
export class D1QuestionRepo {
  async listCategories() { /* D1 query */ }
  async getQuestions(category: string) { /* D1 query */ }
  async addQuestion(input: QuestionRecord) { /* insert question + sync job */ }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w mainland-worker -- app d1-repos`
Expected: PASS

### Task 4: Implement GitHub backup helpers and sync endpoints

**Files:**
- Create: `mainland-worker/src/github.ts`
- Create: `mainland-worker/tests/github-sync.test.ts`
- Modify: `mainland-worker/src/app.ts`

- [ ] **Step 1: Write the failing sync tests**

```ts
test("marks a pending question as synced after GitHub backup succeeds", async () => {
  const result = await syncPendingQuestion(...);
  expect(result.status).toBe("synced");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w mainland-worker -- github-sync`
Expected: FAIL because sync helpers do not exist.

- [ ] **Step 3: Implement minimal backup logic**

```ts
export async function syncPendingQuestion(...) {
  // read pending job from D1
  // rebuild category JSON
  // write to data-mainland/questions/<slug>.json in GitHub
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w mainland-worker -- github-sync`
Expected: PASS

### Task 5: Port the current UI into the mainland frontend

**Files:**
- Create: `mainland-web/src/types.ts`
- Create: `mainland-web/src/lib/api.ts`
- Create: `mainland-web/src/auth/AuthContext.tsx`
- Create: `mainland-web/src/components/AppShell.tsx`
- Create: `mainland-web/src/components/ProtectedRoute.tsx`
- Create: `mainland-web/src/components/StudyDeck.tsx`
- Create: `mainland-web/src/pages/StudyPage.tsx`
- Create: `mainland-web/src/pages/LoginPage.tsx`
- Create: `mainland-web/src/pages/UploadPage.tsx`
- Create: `mainland-web/src/pages/AdminUsersPage.tsx`
- Create: `mainland-web/src/test/setup.ts`
- Create: `mainland-web/src/components/AppShell.test.tsx`
- Create: `mainland-web/src/components/StudyDeck.test.tsx`

- [ ] **Step 1: Write the failing UI tests**

```tsx
test("shows the mainland study shell with active navigation", () => {
  render(<App />);
  expect(screen.getByRole("link", { name: "上传题目" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w mainland-web`
Expected: FAIL because the full page structure is not implemented.

- [ ] **Step 3: Port the existing UI against the new API**

```tsx
<HashRouter>
  <Routes>
    <Route path="/study/:category" element={<StudyPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/upload" element={<UploadPage />} />
    <Route path="/admin/users" element={<AdminUsersPage />} />
  </Routes>
</HashRouter>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w mainland-web`
Expected: PASS

### Task 6: Publish the mainland subsite without breaking the old site

**Files:**
- Modify: `package.json`
- Modify: `.github/workflows/deploy-pages.yml`
- Modify: `README.md`
- Create: `data-mainland/categories.json`
- Create: `data-mainland/questions/shentong-db.json`
- Create: `data-mainland/questions/oracle.json`
- Create: `data-mainland/questions/python.json`
- Create: `data-mainland/questions/wps.json`
- Create: `data-mainland/questions/cybersecurity.json`
- Create: `data-mainland/questions/graph-db.json`
- Create: `data-mainland/questions/other.json`

- [ ] **Step 1: Write the failing deployment assertion**

```bash
test -f mainland-web/dist/index.html
```

- [ ] **Step 2: Run build to verify it fails or is incomplete**

Run: `npm run build`
Expected: FAIL or only build the old site because the mainland workspace is not wired into the root scripts and Pages artifact.

- [ ] **Step 3: Update the build/deploy flow**

```yaml
- run: npm run build -w web
- run: npm run build -w mainland-web
- run: mkdir -p site/mainland
- run: cp -R web/dist/* site/
- run: cp -R mainland-web/dist/* site/mainland/
```

- [ ] **Step 4: Run verification to confirm both sites build**

Run: `npm run build`
Expected: PASS and `site/index.html` plus `site/mainland/index.html` exist.

### Task 7: Final verification

**Files:**
- Test: `mainland-worker/tests/*.ts`
- Test: `mainland-web/src/**/*.test.tsx`

- [ ] **Step 1: Run all tests**

Run: `npm run test`
Expected: PASS for both old and new apps/workers.

- [ ] **Step 2: Run all builds**

Run: `npm run build`
Expected: PASS for both old and new builds.

- [ ] **Step 3: Smoke-check key outputs**

Run: `find mainland-web/dist mainland-worker -maxdepth 2 -type f | sort`
Expected: compiled frontend output and worker source/migrations present.
