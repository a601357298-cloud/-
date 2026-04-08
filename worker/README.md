# Worker Setup

这个 Worker 负责三件事：

- 网站账号登录
- 读取 GitHub 仓库中的题库数据
- 把新题目写回 `a601357298-cloud/-` 仓库

## 1. 创建 D1

```bash
npm run build -w worker
npx wrangler d1 create answer-records
```

把返回的 `database_id` 填进 [wrangler.jsonc](/Users/sk1/Desktop/未命名文件夹/worker/wrangler.jsonc)。

## 2. 执行迁移

```bash
npx wrangler d1 migrations apply answer-records --local
npx wrangler d1 migrations apply answer-records --remote
```

## 3. 配置密钥

复制 `worker/.dev.vars.example` 为 `worker/.dev.vars`，并填好：

- `COOKIE_SECRET`
- `GITHUB_TOKEN`
- `BOOTSTRAP_ADMIN_USERNAME`
- `BOOTSTRAP_ADMIN_DISPLAY_NAME`
- `BOOTSTRAP_ADMIN_PASSWORD_HASH`

管理员密码哈希可以用下面命令生成：

```bash
node worker/scripts/hash-password.mjs 你的密码
```

## 4. 本地开发

```bash
npm run dev -w worker
```

## 5. 部署

```bash
npx wrangler deploy
```

部署后把 Worker 地址写入 [web/.env.example](/Users/sk1/Desktop/未命名文件夹/web/.env.example) 对应的 `VITE_API_BASE_URL`。

