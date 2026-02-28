# Serverless Admin Panel (Git Source of Truth) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现单管理员 serverless 后台，草稿写入 Supabase，发布时将 Markdown 直接提交到 `main`，前台继续只依赖 Git 内容构建。

**Architecture:** 在 Astro 内新增 `/admin` 与 `/api/admin/*`，使用 Supabase Auth + RLS 做身份与草稿权限控制。发布动作走服务端 API：读取草稿、生成 frontmatter+Markdown、调用 GitHub API 写入 `src/content/posts/<slug>.md`。公共站点渲染链路保持不变，不在运行时读取 Supabase。

**Tech Stack:** Astro 5, Svelte 5, Supabase Auth/Postgres/RLS, GitHub REST API, Node.js built-in test runner (`node:test`).

---

> 执行规范：本计划按 @test-driven-development 执行；遇到异常按 @systematic-debugging 排障；任务完成前按 @verification-before-completion 做证据化校验。

### Task 1: 建立后台基础目录与测试基线

**Files:**
- Create: `src/lib/server/admin/constants.ts`
- Create: `tests/admin/smoke.test.mjs`
- Modify: `package.json`
- Test: `tests/admin/smoke.test.mjs`

**Step 1: Write the failing test**

```js
// tests/admin/smoke.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { ADMIN_ROUTES_PREFIX } from "../../src/lib/server/admin/constants.ts";

test("admin route prefix is stable", () => {
  assert.equal(ADMIN_ROUTES_PREFIX, "/admin");
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/admin/smoke.test.mjs`
Expected: FAIL with module/file not found.

**Step 3: Write minimal implementation**

```ts
// src/lib/server/admin/constants.ts
export const ADMIN_ROUTES_PREFIX = "/admin";
```

Modify `package.json` scripts:

```json
{
  "scripts": {
    "test:admin": "node --test tests/admin/**/*.test.mjs"
  }
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/admin/smoke.test.mjs`
Expected: PASS.

**Step 5: Commit**

```bash
git add package.json tests/admin/smoke.test.mjs src/lib/server/admin/constants.ts
git commit -m "test(admin): add baseline node test harness"
```

---

### Task 2: 建立 Supabase 草稿表与 RLS（单管理员）

**Files:**
- Create: `supabase/migrations/20260228_admin_drafts.sql`
- Create: `tests/admin/schema-contract.test.mjs`
- Test: `tests/admin/schema-contract.test.mjs`

**Step 1: Write the failing test**

```js
// tests/admin/schema-contract.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const sql = fs.readFileSync("supabase/migrations/20260228_admin_drafts.sql", "utf8");

test("migration includes draft_posts and publish_logs", () => {
  assert.match(sql, /create table\s+if not exists\s+public\.draft_posts/i);
  assert.match(sql, /create table\s+if not exists\s+public\.publish_logs/i);
});

test("migration enables RLS", () => {
  assert.match(sql, /alter table\s+public\.draft_posts\s+enable row level security/i);
  assert.match(sql, /alter table\s+public\.publish_logs\s+enable row level security/i);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/admin/schema-contract.test.mjs`
Expected: FAIL with missing migration file.

**Step 3: Write minimal implementation**

```sql
-- supabase/migrations/20260228_admin_drafts.sql
create table if not exists public.draft_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  body_markdown text not null default '',
  tags text[] not null default '{}',
  published_at timestamptz,
  status text not null default 'draft',
  last_published_commit_sha text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.publish_logs (
  id uuid primary key default gen_random_uuid(),
  draft_post_id uuid not null references public.draft_posts(id) on delete cascade,
  slug text not null,
  status text not null,
  commit_sha text,
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.draft_posts enable row level security;
alter table public.publish_logs enable row level security;

-- 以单管理员邮箱/uid为准，实施时替换为真实 uid
create policy "admin draft read" on public.draft_posts for select using (auth.uid() is not null);
create policy "admin draft write" on public.draft_posts for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "admin logs read" on public.publish_logs for select using (auth.uid() is not null);
create policy "admin logs write" on public.publish_logs for all using (auth.uid() is not null) with check (auth.uid() is not null);
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/admin/schema-contract.test.mjs`
Expected: PASS.

**Step 5: Commit**

```bash
git add supabase/migrations/20260228_admin_drafts.sql tests/admin/schema-contract.test.mjs
git commit -m "feat(admin): add supabase draft schema with rls"
```

---

### Task 3: 实现 Markdown 序列化（发布核心）

**Files:**
- Create: `src/lib/server/admin/markdown.ts`
- Create: `tests/admin/markdown.test.mjs`
- Test: `tests/admin/markdown.test.mjs`

**Step 1: Write the failing test**

```js
// tests/admin/markdown.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { buildPostMarkdown } from "../../src/lib/server/admin/markdown.ts";

test("build markdown with stable frontmatter", () => {
  const out = buildPostMarkdown({
    title: "Hello",
    slug: "hello",
    description: "d",
    body_markdown: "# Hi",
    tags: ["a", "b"],
    published_at: "2026-02-28T10:00:00.000Z"
  });

  assert.match(out, /^---\ntitle: Hello\npublished:/);
  assert.match(out, /tags: \[a, b\]/);
  assert.match(out, /\n---\n\n# Hi\n$/);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/admin/markdown.test.mjs`
Expected: FAIL with module/file not found.

**Step 3: Write minimal implementation**

```ts
// src/lib/server/admin/markdown.ts
export interface DraftForPublish {
  title: string;
  slug: string;
  description: string;
  body_markdown: string;
  tags: string[];
  published_at?: string;
}

export function buildPostMarkdown(input: DraftForPublish): string {
  const published = input.published_at ?? new Date().toISOString();
  const tags = input.tags.length ? `[${input.tags.join(", ")}]` : "[]";

  return [
    "---",
    `title: ${input.title}`,
    `published: ${published}`,
    `description: ${input.description ?? ""}`,
    `tags: ${tags}`,
    "draft: false",
    "---",
    "",
    input.body_markdown || "",
    ""
  ].join("\n");
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/admin/markdown.test.mjs`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/server/admin/markdown.ts tests/admin/markdown.test.mjs
git commit -m "feat(admin): add markdown serializer for publish flow"
```

---

### Task 4: 实现 GitHub 提交客户端（写入 main）

**Files:**
- Create: `src/lib/server/admin/github.ts`
- Create: `tests/admin/github-payload.test.mjs`
- Modify: `src/env.d.ts`
- Test: `tests/admin/github-payload.test.mjs`

**Step 1: Write the failing test**

```js
// tests/admin/github-payload.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { buildRepoPath, toBase64Content } from "../../src/lib/server/admin/github.ts";

test("repo path is mapped to content posts", () => {
  assert.equal(buildRepoPath("hello-world"), "src/content/posts/hello-world.md");
});

test("content is base64 encoded", () => {
  assert.equal(toBase64Content("abc"), "YWJj");
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/admin/github-payload.test.mjs`
Expected: FAIL with module/file not found.

**Step 3: Write minimal implementation**

```ts
// src/lib/server/admin/github.ts
export function buildRepoPath(slug: string): string {
  return `src/content/posts/${slug}.md`;
}

export function toBase64Content(content: string): string {
  return Buffer.from(content, "utf8").toString("base64");
}

export async function upsertPostToGitHub(/* env + slug + markdown */) {
  // 使用 GitHub Contents API:
  // 1) GET file (拿 sha，可选)
  // 2) PUT file 到 main（含 message/content/sha）
  // 返回 commit sha
}
```

Update `src/env.d.ts` 增加 server 环境变量类型（示例）：

```ts
interface ImportMetaEnv {
  readonly GITHUB_TOKEN: string;
  readonly GITHUB_OWNER: string;
  readonly GITHUB_REPO: string;
  readonly GITHUB_BRANCH: string;
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/admin/github-payload.test.mjs`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/server/admin/github.ts src/env.d.ts tests/admin/github-payload.test.mjs
git commit -m "feat(admin): add github content commit client primitives"
```

---

### Task 5: 后台鉴权与路由保护

**Files:**
- Create: `src/lib/server/admin/auth.ts`
- Create: `src/middleware.ts`
- Create: `src/pages/admin/login.astro`
- Create: `src/pages/admin/index.astro`
- Test: `tests/admin/auth-guard.test.mjs`

**Step 1: Write the failing test**

```js
// tests/admin/auth-guard.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { shouldProtectPath } from "../../src/lib/server/admin/auth.ts";

test("admin routes are protected", () => {
  assert.equal(shouldProtectPath("/admin"), true);
  assert.equal(shouldProtectPath("/admin/posts/1"), true);
  assert.equal(shouldProtectPath("/posts/abc"), false);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/admin/auth-guard.test.mjs`
Expected: FAIL with module/file not found.

**Step 3: Write minimal implementation**

```ts
// src/lib/server/admin/auth.ts
export function shouldProtectPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export async function requireAdminSession(/* Astro locals/request */) {
  // 校验 supabase session + email allowlist
}
```

```ts
// src/middleware.ts
import { defineMiddleware } from "astro:middleware";
import { shouldProtectPath } from "./lib/server/admin/auth";

export const onRequest = defineMiddleware(async (context, next) => {
  if (shouldProtectPath(context.url.pathname)) {
    // 未登录 -> redirect('/admin/login')
  }
  return next();
});
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/admin/auth-guard.test.mjs`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/server/admin/auth.ts src/middleware.ts src/pages/admin/login.astro src/pages/admin/index.astro tests/admin/auth-guard.test.mjs
git commit -m "feat(admin): add auth guard and protected admin shell"
```

---

### Task 6: 草稿 CRUD API + 管理页联调

**Files:**
- Create: `src/pages/api/admin/drafts/index.ts`
- Create: `src/pages/api/admin/drafts/[id].ts`
- Create: `src/components/admin/DraftEditor.svelte`
- Modify: `src/pages/admin/index.astro`
- Test: `tests/admin/draft-api-contract.test.mjs`

**Step 1: Write the failing test**

```js
// tests/admin/draft-api-contract.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDraftInput } from "../../src/pages/api/admin/drafts/index.ts";

test("draft input requires title and slug", () => {
  assert.throws(() => normalizeDraftInput({ title: "", slug: "" }));
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/admin/draft-api-contract.test.mjs`
Expected: FAIL with missing export/function.

**Step 3: Write minimal implementation**

```ts
// src/pages/api/admin/drafts/index.ts
export function normalizeDraftInput(body: any) {
  if (!body?.title || !body?.slug) throw new Error("title and slug required");
  return {
    title: String(body.title),
    slug: String(body.slug),
    description: String(body.description ?? ""),
    body_markdown: String(body.body_markdown ?? ""),
    tags: Array.isArray(body.tags) ? body.tags.map(String) : []
  };
}

// GET: list drafts
// POST: create draft
```

`src/pages/api/admin/drafts/[id].ts` 提供 GET/PATCH/DELETE。
`DraftEditor.svelte` 实现最小编辑表单（标题、slug、摘要、正文、tags）。

**Step 4: Run test to verify it passes**

Run: `node --test tests/admin/draft-api-contract.test.mjs`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/pages/api/admin/drafts/index.ts src/pages/api/admin/drafts/[id].ts src/components/admin/DraftEditor.svelte src/pages/admin/index.astro tests/admin/draft-api-contract.test.mjs
git commit -m "feat(admin): add draft CRUD api and editor"
```

---

### Task 7: 发布 API（Supabase Draft -> Git main）

**Files:**
- Create: `src/pages/api/admin/publish.ts`
- Modify: `src/lib/server/admin/github.ts`
- Modify: `src/lib/server/admin/markdown.ts`
- Modify: `src/pages/admin/index.astro`
- Test: `tests/admin/publish-contract.test.mjs`

**Step 1: Write the failing test**

```js
// tests/admin/publish-contract.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { toPublishPath } from "../../src/pages/api/admin/publish.ts";

test("publish path matches blog content tree", () => {
  assert.equal(toPublishPath("abc"), "src/content/posts/abc.md");
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/admin/publish-contract.test.mjs`
Expected: FAIL with missing export/function.

**Step 3: Write minimal implementation**

```ts
// src/pages/api/admin/publish.ts
export function toPublishPath(slug: string) {
  return `src/content/posts/${slug}.md`;
}

// POST flow:
// 1) require admin session
// 2) fetch draft by id
// 3) markdown = buildPostMarkdown(draft)
// 4) commitSha = upsertPostToGitHub(...)
// 5) update draft status + insert publish_logs
// 6) return { ok: true, commitSha }
```

管理页新增“发布”按钮与结果提示（commit sha / 错误信息）。

**Step 4: Run test to verify it passes**

Run: `node --test tests/admin/publish-contract.test.mjs`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/pages/api/admin/publish.ts src/lib/server/admin/github.ts src/lib/server/admin/markdown.ts src/pages/admin/index.astro tests/admin/publish-contract.test.mjs
git commit -m "feat(admin): publish drafts to git main"
```

---

### Task 8: 端到端验证与文档补充

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`
- Create: `docs/plans/2026-02-28-serverless-admin-runbook.md`

**Step 1: Write the failing test**

```bash
# 失败验证：未设置环境变量时，发布接口应报错
pnpm dev
# 新终端：调用 /api/admin/publish
# 预期 500 + 缺少 env 提示（此时尚未补齐配置）
```

**Step 2: Run test to verify it fails**

Run: `pnpm type-check`
Expected: FAIL 或警告（若存在未声明环境变量/类型）。

**Step 3: Write minimal implementation**

- README 增加后台环境变量与初始化步骤：
  - `PUBLIC_SUPABASE_URL`
  - `PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GITHUB_TOKEN`
  - `GITHUB_OWNER`
  - `GITHUB_REPO`
  - `GITHUB_BRANCH=main`
  - `ADMIN_EMAIL`
- 增加 Runbook：登录、建草稿、发布、失败重试、回滚。
- CLAUDE.md 增加后台相关开发命令与验证步骤。

**Step 4: Run test to verify it passes**

Run:
1. `pnpm type-check`
2. `pnpm lint`
3. `pnpm build`
4. `pnpm test:admin`

Expected: all PASS。

**Step 5: Commit**

```bash
git add README.md CLAUDE.md docs/plans/2026-02-28-serverless-admin-runbook.md
git commit -m "docs(admin): add setup and operations runbook"
```
