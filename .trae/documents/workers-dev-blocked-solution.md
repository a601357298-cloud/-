# 解决大陆无法访问 workers.dev 域名的方案计划

## 1. 现状分析
当前 Mainland 子站前端部署在 GitHub Pages 上，其所有的 API 请求（如登录、拉取题库）都被配置为发送到 Cloudflare Worker 的默认域名：
`https://mainland-answer-record-api.a601357298.workers.dev`
（配置在 [.github/workflows/deploy-pages.yml](file:///workspace/.github/workflows/deploy-pages.yml#L38-L42) 中）

**根本原因**：`*.workers.dev` 域名在中国大陆长期受到 SNI 阻断和 DNS 污染。这就导致前端页面能加载，但一发起后端 API 请求就会超时或被直接阻断（Connection Reset），从而表现为“登录无响应”、“题库一直加载”。

## 2. 解决方案对比（免费版 vs 付费版）

为解决此问题，我为您提供以下两种替代方案，供您权衡：

### 方案一：绑定自定义域名（付费，强烈推荐）
这是最规范、最稳定且性能最好的解决方式。

- **成本**：**极低**。Cloudflare 侧的绑定和流量是**完全免费**的。您只需要花钱购买一个域名。如果购买非主流后缀（如 `.top`、`.icu`、`.site` 等），首年价格通常只要 **1~2 美元（约 7~15 元人民币）**。
- **性能差异**：**极佳**。
  - 链路：`大陆用户 -> Cloudflare 边缘节点 -> Worker API -> D1 数据库`。
  - 延迟：大陆直连 Cloudflare 节点（通常路由到美西或亚洲其他节点），无额外跳转，速度和稳定性最好。
- **实施步骤**：
  1. 在任意域名注册商（如腾讯云、阿里云、Namecheap 等）购买一个廉价域名。
  2. 将该域名的 DNS 解析托管给 Cloudflare（免费）。
  3. 在 Cloudflare 控制台中，进入 `mainland-answer-record-api` 的“设置 -> 触发器”，添加“自定义域”（Custom Domain）。
  4. 将 `.github/workflows/deploy-pages.yml` 中的 `VITE_API_BASE_URL` 替换为您的新域名。

### 方案二：使用 Vercel / 免费代理平台做反向代理（免费）
如果您完全不想花钱，可以利用其他在大陆尚未被彻底墙掉的 Serverless 平台（如 Vercel 的 `.vercel.app` 域名）作为一个“跳板”来反代您的 Worker。

- **成本**：**完全免费**（0 元）。
- **性能差异**：**一般至中等**。
  - 链路：`大陆用户 -> Vercel 节点 -> Cloudflare Worker -> D1 数据库`。
  - 延迟：因为多了一层中转（跳板），网络请求的延迟会增加（通常增加几十至一百毫秒左右）。
  - 稳定性隐患：免费平台的共享域名（如 `vercel.app`）在大陆部分地区也偶尔会遭到运营商阻断，可用性虽高于 `workers.dev`，但无法保证 100% 稳定。
- **实施步骤**：
  1. 在您的 GitHub 账号下新建一个代理仓库。
  2. 仓库中仅需一个配置文件（例如 `vercel.json`），写明将所有的请求代理转发（Rewrite）到 `https://mainland-answer-record-api.a601357298.workers.dev`。
  3. 在 Vercel 免费部署该仓库，您会得到一个类似 `my-proxy.vercel.app` 的域名。
  4. 将 `.github/workflows/deploy-pages.yml` 中的 `VITE_API_BASE_URL` 替换为该 Vercel 域名。

---

## 3. 代码修改计划 (Proposed Changes)

无论您选择上述哪一种方案，最终在代码层面只需要做一处更改：

**修改文件**：`.github/workflows/deploy-pages.yml`
**修改内容**：
找到 `Build mainland site` 这一步，将其中的 `VITE_API_BASE_URL` 环境变量值更新为您最终确定的可用域名。

```yaml
      - name: Build mainland site
        run: npm run build -w mainland-web
        env:
          # 将这里的 https://mainland-answer-record-api.a601357298.workers.dev 
          # 替换为您的自定义域名或 Vercel 代理域名
          VITE_API_BASE_URL: <YOUR_NEW_DOMAIN_URL>
```

**跨域配置补充**：
在 [mainland-worker/wrangler.jsonc](file:///workspace/mainland-worker/wrangler.jsonc) 中，您已经将 `UI_ORIGIN` 正确配置为了 `https://a601357298-cloud.github.io`。只要这个前端源地址不变，后端关于 CORS 的 Cookie 和跨域认证就能继续正常工作，无需修改后端代码逻辑。

## 4. 验证方式 (Verification)
1. 提交上述 `.github/workflows/deploy-pages.yml` 的修改后，等待 GitHub Actions 自动重新构建并部署 GitHub Pages。
2. 打开 `https://a601357298-cloud.github.io/-/mainland/`。
3. 打开浏览器开发者工具 (F12) -> Network 面板。
4. 验证发送至 `/api/categories` 和 `/api/questions` 的请求目标是否已经变成了新域名。
5. 验证登录是否能够正常完成（响应码 200，并且携带 `set-cookie` 标头）。
