# Mainland Subsite Design

**Date:** 2026-04-09

## Goal

在同一个 GitHub 仓库中新增一个独立子站 `/mainland/`，面向中国大陆网络环境优化访问稳定性。旧站保持现状不变；新站沿用现有界面与核心交互，但使用独立的前端、独立的 Worker、独立的 D1 数据库，以及独立的题库和账号体系。

## Confirmed Decisions

- 旧站继续保留，不迁移、不下线、不改现有地址。
- 新站放在同仓库下，访问路径使用 `/mainland/`。
- 新站沿用现有界面风格和交互逻辑，不做大幅视觉重设计。
- 新站与旧站使用独立数据，不共用账号、不共用题库。
- 新站的浏览与上传都以 D1 为主数据源。
- GitHub 只作为新站的异步备份目标，不参与新站实时浏览和上传成功判定。

## Why This Design

旧站目前的核心问题是浏览链路实时依赖 GitHub，导致中国大陆访问题库时容易因为 GitHub 网络不稳定而加载失败。若只把浏览改为 D1、上传仍要求 GitHub 成功，用户上传体验依然会在网络波动时失败。因此新站采用“D1 主库，GitHub 异步备份”的结构，优先保证大陆用户的浏览和上传成功率，同时保留 GitHub 作为备份和历史留档。

## High-Level Architecture

新站由四部分组成：

1. `mainland-web/`
   新子站前端，界面沿用现有站点风格，构建后部署到 `/mainland/` 路径。

2. `mainland-worker/`
   新子站后端接口，负责登录、题库浏览、题目上传、账号管理和 GitHub 异步备份调度。

3. `mainland-answer-records` D1
   新站唯一实时数据库，保存账号、分类、题目和同步任务状态。

4. `data-mainland/`
   同仓库中的 GitHub 备份目录。新站不从这里读取实时数据，但会把题库异步同步进来，作为备份和版本记录。

## URL Strategy

- 旧站保持当前路径不变。
- 新站前端目标路径：`https://a601357298-cloud.github.io/-/mainland/`
- 新站 API 使用独立 Worker 域名，避免和旧站耦合。

## Repository Layout

在当前仓库中新增以下结构：

```text
web/                    旧站前端，保持不动
worker/                 旧站 Worker，保持不动
mainland-web/           新子站前端
mainland-worker/        新子站 Worker
data-mainland/
  categories.json       新站 GitHub 备份分类文件
  questions/
    *.json              新站 GitHub 备份题库文件
docs/superpowers/specs/
```

## Frontend Design

### Scope

新站前端延用旧站现有信息架构：

- 首页默认进入某个默认分类刷题
- 分类切换
- 题卡翻面
- 左右切题
- 登录后上传题目
- 管理员管理账号

### Boundaries

- 新前端不与旧站共享构建产物，也不共用入口 HTML。
- 新前端可复用旧站的视觉风格和交互模式，但配置、路由和 API 地址独立。
- 新前端默认构建基路径设置为 `/-/mainland/`，保证在 GitHub Pages 子目录下可正常运行。

### Routes

新前端沿用旧站的页面结构，但位于新子站目录：

- `/mainland/` -> 重定向到默认学习页
- `/mainland/#/study/:category`
- `/mainland/#/login`
- `/mainland/#/upload`
- `/mainland/#/admin/users`

## Backend Design

### Scope

新 Worker 提供一套独立接口：

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/categories`
- `GET /api/questions?category=<slug>`
- `POST /api/questions`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id`
- `DELETE /api/admin/users/:id`

### Core Rule

新 Worker 的所有读取行为都只读 D1，不读 GitHub。只有备份任务会访问 GitHub。

## D1 Schema

### `users`

保存新站账号：

- `id`
- `username`
- `display_name`
- `role`
- `password_hash`
- `created_at`

### `categories`

保存新站分类：

- `slug`
- `name`
- `sort_order`
- `is_default`
- `created_at`

### `questions`

保存新站题目：

- `id`
- `category_slug`
- `question`
- `answer`
- `author_name`
- `created_by_user_id`
- `created_at`
- `sync_status`
- `last_synced_at`
- `sync_error`

### `sync_jobs`

保存 GitHub 备份任务：

- `id`
- `job_type`
- `target_path`
- `payload_json`
- `status`
- `attempt_count`
- `last_error`
- `created_at`
- `updated_at`

## Data Flow

### Browsing

1. 前端请求新 Worker 的 `/api/categories`
2. Worker 从 D1 `categories` 与 `questions` 聚合分类数量
3. 前端请求 `/api/questions?category=...`
4. Worker 从 D1 `questions` 返回该分类完整题目

这个流程完全不触发 GitHub。

### Uploading

1. 用户登录后提交新题目
2. Worker 校验登录态和分类合法性
3. Worker 先把题目写入 D1 `questions`
4. Worker 立刻返回上传成功
5. Worker 同时创建一条 `sync_jobs` 记录，标记需要将这道题备份到 GitHub

### GitHub Backup

备份链路不阻塞用户成功返回：

1. Worker 后台任务读取待同步的 `sync_jobs`
2. 将最新分类或题目写入仓库 `data-mainland/`
3. 同步成功后更新 `questions.sync_status` 和 `sync_jobs.status`
4. 同步失败则记录 `sync_error`，等待重试

## GitHub Backup Format

新站备份目录采用与旧站接近的结构，便于后续维护：

```text
data-mainland/
  categories.json
  questions/
    shentong-db.json
    oracle.json
    python.json
    wps.json
    cybersecurity.json
    graph-db.json
    other.json
```

每个分类文件保存该分类完整题目数组。备份任务写 GitHub 时，以 D1 当前最新数据生成目标 JSON 文件。

## Sync Strategy

### Recommended Initial Version

第一版采用“写题后创建待同步任务 + 管理接口触发重试”的方式，不引入队列产品。原因是：

- 保持结构简单
- 当前网站规模较小
- 先解决大陆可用性问题，比复杂后台调度更重要

### Retry Behavior

- 新题默认 `sync_status = pending`
- 备份成功后改为 `synced`
- 失败后改为 `failed`，记录错误文本
- 管理员后续可增加“重试同步”按钮或定时任务

## Auth Boundary

- 新站账号独立于旧站
- 新站管理员、普通用户均只存在于新站 D1
- 本项目范围内不迁移旧站账号到新站
- 新站管理员初始账号由环境变量引导写入 D1

## Deployment Strategy

### Frontend

- 新增 `mainland-web/`
- 构建产物发布到 GitHub Pages 的 `/mainland/` 子目录
- 不覆盖旧站根目录产物

### Worker

- 新增 `mainland-worker/`
- 绑定独立 D1 数据库
- 配置独立的 Cookie Secret 和 GitHub 备份目录

### D1

新增独立数据库：

- 名称固定为：`mainland-answer-records`

## Migration / Bootstrap

新站为独立数据，不从旧站继承题库与账号，因此初始化只需要：

1. 创建新 D1 数据库
2. 建表
3. 写入固定分类
4. 写入管理员账号
5. 准备空的 `data-mainland/` GitHub 备份目录

## Testing Strategy

### Backend

- 登录成功与失败
- 未登录上传被拒绝
- 管理员创建/修改/删除账号
- 浏览接口从 D1 正常返回分类与题目
- 上传成功后立即可读到新题
- GitHub 备份失败不影响上传成功
- 同步状态从 `pending` 到 `synced` 或 `failed`

### Frontend

- `/mainland/` 路径下资源正常加载
- 默认分类跳转正常
- 分类切换、题卡翻面、左右切题正常
- 上传成功后不依赖 GitHub 立即可见
- 管理员页账号管理正常

## Risks And Non-Goals

### Risks

- 同仓库双前端发布时，GitHub Pages 构建需要明确产物路径，否则可能覆盖旧站
- 若异步备份长期失败，GitHub 备份会落后于 D1 主数据
- 同仓库维护双站，后续若复制过多组件，可能产生重复代码

### Non-Goals

- 本次不改旧站结构
- 本次不让新旧站共用数据
- 本次不做视觉重设计
- 本次不引入复杂消息队列或外部任务系统

## Recommended Next Step

按本设计继续进入实施计划，拆成以下子任务：

1. 建立 `mainland-web/` 基础前端
2. 建立 `mainland-worker/` 与 D1 schema
3. 实现浏览、上传、账号管理主链路
4. 实现 GitHub 异步备份
5. 更新 GitHub Pages 部署为双站发布
