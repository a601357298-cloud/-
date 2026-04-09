# 答题记录网站 (Answer Record Site) 项目 Wiki

## 1. 项目概述
该项目是一个基于 **Cloudflare Workers** 和 **GitHub Pages** 驱动的“答题记录网站”单页应用。
由于主站通过 GitHub API 直接读写数据的设计在中国大陆网络环境中存在极大的不稳定性，项目演化出了双版本架构（Monorepo）：
- **Global 版本 (主站)**：部署为全局访问站点。采用轻量级后端，题库数据直接与 GitHub API 进行交互。
- **Mainland 版本 (大陆版)**：面向中国大陆优化。为了解决 GitHub API 连通性问题，该版本启用了完全独立的 D1 数据库作为缓存/主存储，保证了极速响应，并通过后台异步队列将数据备份回 GitHub。

## 2. 系统架构
项目采用标准的前后端分离机制：
- **前端 (Frontend)**：基于 React 18 + Vite 开发，UI 和交互在主站和大陆版之间基本保持一致。前端资源最终被构建并托管至 GitHub Pages。
- **后端 (Backend)**：使用 Cloudflare Workers 无服务器计算平台提供 API。
- **数据库 (Database)**：使用 Cloudflare 提供的 Serverless SQL 数据库 **D1**。
  - **主站 D1**：仅用于存储和校验管理员与用户的登录状态。
  - **大陆版 D1**：不仅存储用户，还存储所有的分类、题目及用于 GitHub 同步的任务队列 (`sync_jobs`)。
- **数据持久化**：所有的业务数据（题库、分类）以 JSON 文件的形式在 GitHub 仓库中被持久化（分别位于 `data/` 与 `data-mainland/` 目录），起到了天然的数据版本控制的作用。

## 3. 核心模块分析
项目通过 npm workspaces 被划分为四个核心目录：

- **`web/`**
  主站前端。主要提供浏览题目、用户登录、题目上传以及管理员系统等 UI 组件。构建目标的基础路径被配置为根级路径（或 `/-/`）。
- **`worker/`**
  主站后端。提供以 `/api/` 为前缀的一系列接口。读写题目时，它会通过 `GitHubQuestionRepo` 直接请求 GitHub API 并修改 `data/` 下的文件。
- **`mainland-web/`**
  大陆版前端。基本复用了主站的组件代码，但在 Vite 配置（见 [vite.config.ts](file:///workspace/mainland-web/vite.config.ts)）中将其 `base` 路径指向了子目录 `/-/mainland/`。它将请求发送到大陆版专属的 Worker 域名。
- **`mainland-worker/`**
  大陆版后端。包含复杂的 D1 数据层实现。当用户获取题库时，它直接读取 D1 数据库；当用户上传题目时，它先写入 D1 以实现“秒回”，然后创建一条 `sync_jobs`，等待触发后台备份逻辑更新 GitHub `data-mainland/` 目录。

## 4. 关键类与核心接口
* **前端入口与路由**
  - **`App`**: 前端的顶层路由组件，使用 `HashRouter` 定义了诸如 `/study/:category`（学习页面）、`/login`（登录页面）、`/upload`（上传页面） 等前端路由。详见 [App.tsx](file:///workspace/web/src/App.tsx)。
  - **`api`**: 前端 HTTP 请求层，封装了所有的后端调用逻辑（如 `api.login()`, `api.questions()`）。详见 [api.ts](file:///workspace/web/src/lib/api.ts)。
* **后端路由与业务逻辑**
  - **`createApp(deps: AppDeps)`**: API 的核心路由分发器工厂函数。为了最大程度实现主站和大陆版代码的复用，它使用依赖注入（`AppDeps`）的方式挂载底层数据提供者。详见 [app.ts](file:///workspace/worker/src/app.ts)。
* **后端数据层 (Repositories & Stores)**
  - **`D1UserStore`**: 负责在 D1 数据库中管理用户 CRUD（创建、查询、鉴权校验等），被两个 Worker 共同采用。详见 [database.ts](file:///workspace/worker/src/database.ts)。
  - **`GitHubQuestionRepo`**: (仅 `worker/` 使用) 实现了从 GitHub API 读写 `data/questions/*.json` 的逻辑。详见 [github.ts](file:///workspace/worker/src/github.ts)。
  - **`D1QuestionRepo`** 及 **`D1CategoryStore`**: (仅 `mainland-worker/` 使用) 针对大陆网络环境优化，完全通过本地 D1 数据库提供题库的高速读取和写入。详见 [database.ts](file:///workspace/mainland-worker/src/database.ts)。
  - **`GitHubQuestionBackupRepo`**: 配合同步任务存储 `D1SyncJobStore`，用于在大陆版本中处理到 GitHub 的异步数据备份操作。

## 5. 技术栈与核心依赖
项目的整体技术栈定义在根目录的 `package.json` 及各模块下：
- **前端库**:
  - `react` / `react-dom` (^18.3.1): UI 渲染。
  - `react-router-dom` (^6.30.1): 客户端 Hash 路由管理。
  - `vite` (^6.0.3): 前端极速构建工具。
- **后端框架**:
  - `wrangler` (^4.10.0): Cloudflare Workers 官方 CLI 开发与部署工具。
  - `@cloudflare/workers-types`: Cloudflare API 原生类型声明。
- **语言与测试**:
  - `typescript` (^5.7.2): 贯穿整个 Monorepo 体系的语言。
  - `vitest` + `@testing-library/react` + `jsdom`: 提供全栈单元测试环境。

## 6. 运行与部署指南

### 1. 依赖安装
由于使用了 NPM Workspaces 架构，只需在项目根目录安装一次依赖即可：
```bash
npm install
```

### 2. 环境变量配置
在后端目录中复制并配置开发环境变量文件：
```bash
cp worker/.dev.vars.example worker/.dev.vars
cp mainland-worker/.dev.vars.example mainland-worker/.dev.vars
```
*注：请务必在 `.dev.vars` 中配置你的 `GITHUB_TOKEN` 以及超级管理员的初始化密码（`BOOTSTRAP_ADMIN_*` 相关字段）。*

### 3. 本地数据库初始化 (D1 Migrations)
开发前需要通过 Wrangler 初始化本地的 SQLite 环境：
```bash
# 1. 初始化主站用户数据库
npx wrangler d1 execute answer-records --local --file=worker/migrations/0001_users.sql

# 2. 初始化大陆版全量数据库 (包含 user, category, question, sync_job 表)
npx wrangler d1 execute mainland-answer-records --local --file=mainland-worker/migrations/0001_mainland_schema.sql
```
*(部分初始测试数据可通过 `scripts/seed-*.sql` 文件按需打入)*

### 4. 启动开发服务器
可以使用 npm scripts 一键启动特定的开发环境：
```bash
# ==== 前端服务 ====
npm run dev -w web            # 启动主站前端 (默认端口 http://localhost:5173)
npm run dev -w mainland-web   # 启动大陆版前端

# ==== 后端服务 ====
npm run dev -w worker         # 启动主站 Cloudflare Worker
npm run dev -w mainland-worker# 启动大陆版 Cloudflare Worker
```

### 5. 构建与测试
项目在根目录下的 package.json 封装了全量操作命令：
- **构建所有模块**：运行 `npm run build`，此命令将按顺序对所有 4 个 workspace 执行 TypeScript 检查并打包。
- **运行单元测试**：运行 `npm run test`，会触发全部子模块内部的 Vitest 测试流程，验证核心逻辑与 UI 渲染无误。
