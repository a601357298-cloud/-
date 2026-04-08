# Worker Setup

这个 Worker 负责三件事：

- 网站账号登录
- 读取 GitHub 仓库中的题库数据
- 把新题目和站内账号都写回 `a601357298-cloud/-` 仓库中的 JSON 文件

## 1. 配置密钥

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

## 2. 本地开发

```bash
npm run dev -w worker
```

## 3. 部署

```bash
npx wrangler deploy
```

部署后把 Worker 地址写入 [web/.env.example](/Users/sk1/Desktop/未命名文件夹/web/.env.example) 对应的 `VITE_API_BASE_URL`。
