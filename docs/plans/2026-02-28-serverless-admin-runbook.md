# Serverless Admin Runbook

## 1. 目标与范围

本 runbook 适用于本仓库新增的 serverless 后台流程：
- 登录后台
- 创建/编辑草稿
- 发布到 Git 仓库（`main`）
- 发布失败后的重试
- 发布后的回滚

前台页面仍然只从 Git 内容构建，不直接读取 Supabase。

## 2. 前置条件

### 2.1 环境变量

确保 `.env` 已配置：

```env
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GITHUB_TOKEN=ghp_xxx
GITHUB_OWNER=your-username
GITHUB_REPO=your-repo
GITHUB_BRANCH=main
ADMIN_EMAIL=admin@example.com
```

### 2.2 数据库迁移

```bash
supabase db push
```

确认迁移 `supabase/migrations/20260228_admin_drafts.sql` 已应用。

## 3. 登录流程

1. 运行开发环境：`pnpm dev`
2. 打开 `/admin/login`
3. 使用 Supabase 中与 `ADMIN_EMAIL` 一致的账号登录
4. 登录成功后进入 `/admin`

若访问 `/admin` 被重定向到 `/admin/login`，说明当前会话未通过鉴权。

## 4. 建草稿与编辑

1. 在 `/admin` 页面填写：`title`、`slug`、`description`、`body_markdown`、`tags`
2. 提交后调用：`POST /api/admin/drafts`
3. 列表查询调用：`GET /api/admin/drafts`
4. 单条修改调用：`PATCH /api/admin/drafts/:id`
5. 删除调用：`DELETE /api/admin/drafts/:id`

最小校验：`title` 和 `slug` 不能为空。

## 5. 发布流程（Supabase Draft -> Git main）

1. 在管理页点击“发布”按钮
2. 后端接口：`POST /api/admin/publish`
3. 服务端执行：
   - 读取草稿
   - 生成 frontmatter + markdown
   - 调用 GitHub Contents API 写入 `src/content/posts/<slug>.md`
   - 记录发布日志
4. 返回 `commitSha` 后，可在 GitHub 仓库核对提交

## 6. 失败重试

当发布失败时：

1. 查看接口返回错误（管理页提示 + API 响应）
2. 常见原因：
   - GitHub Token 权限不足
   - 仓库 owner/repo/branch 配置错误
   - slug 冲突或路径异常
   - Supabase 连接/权限问题
3. 修正环境变量或数据后，重新点击发布
4. 若需要，先更新草稿内容再重试发布

## 7. 回滚流程

发布后如需回滚：

### 方案 A（推荐）：Git 回滚

1. 在仓库中定位目标提交（`commitSha`）
2. 使用 Git revert 生成反向提交
3. 触发站点重新构建部署

### 方案 B：后台再次发布修正内容

1. 在后台修复草稿内容
2. 重新发布，生成新的提交覆盖错误内容

## 8. 发布前验证清单

每次后台改动后至少执行：

```bash
pnpm type-check
pnpm lint
pnpm build
pnpm test:admin
```

预期：全部通过；若 lint 存在历史遗留问题，需在变更说明中明确标注与本次改动无关。
