# 答题记录网站

一个面向技术题库的答题记录网站：

- 首页默认进入 `Python` 分类随机刷题
- 浏览公开开放
- 上传题目需要站内账号登录
- Worker 用站长自己的 GitHub Token 统一把题目写回仓库
- 新增规划中的 `/mainland/` 子站，使用独立数据与更稳的大陆访问链路

## 技术栈

- 前端：Vite + React + TypeScript + Hash Router
- 后端：Cloudflare Workers
- 数据源：旧站题库保存在 GitHub 仓库中的 `data/categories.json` 与 `data/questions/*.json`，旧站账号保存在 Cloudflare D1；新站 `/mainland/` 使用独立 D1 与 `data-mainland/` 备份目录
- 部署：GitHub Pages + Cloudflare Workers

## 项目结构

```text
web/                  React 前端
worker/               Cloudflare Worker
data/                 仓库题库数据
mainland-web/         大陆优化子站前端
mainland-worker/      大陆优化子站 Worker
data-mainland/        大陆优化子站 GitHub 备份目录
.github/workflows/    GitHub Pages 工作流
```

## 本地启动

### 1. 安装依赖

```bash
npm install
```

### 2. 启动 Worker

先按 [worker/README.md](/Users/sk1/Desktop/未命名文件夹/worker/README.md) 配置 `.dev.vars`：

```bash
npm run dev -w worker
```

### 3. 启动前端

在 `web/.env` 里写入 Worker 地址：

```bash
VITE_API_BASE_URL=http://127.0.0.1:8787
```

然后启动：

```bash
npm run dev -w web
```

## 验证

```bash
npm run test
npm run build
```

## 上线步骤

1. 在 Cloudflare 部署 Worker，并记下公开地址。
2. 在 GitHub 仓库 `Secrets and variables -> Actions` 中添加 `VITE_API_BASE_URL`。
3. 把代码推到 `main`，GitHub Actions 会发布到 `https://a601357298-cloud.github.io/-/`。
4. Worker 中保存 `GITHUB_TOKEN`、`COOKIE_SECRET` 和管理员引导变量。
