# Serverless Admin Panel (Git as Source of Truth) Design

> **For Claude:** This is a validated design doc from brainstorming. Git content remains the sole production source; Supabase is draft staging only.

**Goal:** Build a single-admin serverless management panel where drafts are stored in Supabase, but published articles are committed to `main` as Markdown files under `src/content/posts/`, then deployed by existing CI/CD.

**Architecture:** The blog frontend remains static and unchanged in content source semantics (reads only from repository Markdown during build). An authenticated `/admin` interface writes draft data to Supabase. A server-side publish function converts draft fields to frontmatter + Markdown and commits directly to GitHub `main` via API. No runtime frontend dependence on Supabase for public pages.

**Tech Stack:** Astro 5 + Svelte 5 (existing), Supabase Auth + Postgres + RLS, GitHub API (MCP/REST), serverless function runtime (Supabase Edge Function or equivalent).

---

## 1. Scope & Non-Goals

### In scope
- Single administrator login-protected `/admin`
- Draft CRUD in Supabase
- One-click publish from draft to Git Markdown file
- Automatic deployment through existing repository pipeline
- Publish logs and basic failure visibility

### Out of scope (initial phase)
- Multi-user roles and permissions
- Rich media asset management pipeline (object storage/CDN orchestration)
- Visual WYSIWYG editor parity with all Markdown syntax
- Public-site runtime reading from Supabase

---

## 2. End-to-End Flow

1. Admin logs in at `/admin/login` via Supabase Auth (single email allowlist).
2. Admin edits draft in `/admin/posts/:id`; data saved to Supabase `draft_posts`.
3. Admin clicks **Publish**.
4. Publish API (server-side only):
   - validates admin session,
   - fetches draft,
   - converts draft model to Markdown with frontmatter,
   - writes/updates `src/content/posts/<slug>.md` on `main`.
5. GitHub push triggers deployment; new content becomes visible after build.
6. API writes result metadata (`commit_sha`, timestamp, status) to publish log table.

---

## 3. Security Design for `/admin`

### 3.1 Identity & Access
- Supabase Auth for administrator login.
- Only one whitelisted email can sign in.
- Registration endpoints not exposed in UI.

### 3.2 Route Protection
- `/admin/**` routes require server-side session check.
- Unauthenticated requests redirect to login page.
- Publish endpoint re-validates session (no trust in client state).

### 3.3 Database Security (RLS)
- `draft_posts` and `publish_logs` have RLS enabled.
- Policies allow read/write only for authenticated admin user.
- `anon` has no write access to draft or publish log tables.

### 3.4 Secret Isolation
- High-privilege secrets (`SUPABASE_SERVICE_ROLE_KEY`, GitHub write token/app key) stored only in serverless environment.
- Client never receives write-capable GitHub credentials.
- Public frontend can keep using low-privilege public config and remains decoupled from draft DB.

### 3.5 Abuse Controls
- Publish endpoint rate limit (e.g., per user + IP).
- Audit trail for each publish attempt (success/failure, slug, commit SHA, timestamp).

---

## 4. Data Model (Supabase)

### `draft_posts`
- `id` (uuid, pk)
- `slug` (text, unique)
- `title` (text)
- `description` (text)
- `body_markdown` (text)
- `tags` (text[])
- `published_at` (timestamptz, optional for frontmatter mapping)
- `updated_at` (timestamptz)
- `status` (text: `draft` | `published` | `publish_failed`)
- `last_published_commit_sha` (text, nullable)

### `publish_logs`
- `id` (uuid, pk)
- `draft_post_id` (uuid, fk)
- `slug` (text)
- `status` (`success` | `failed`)
- `commit_sha` (text, nullable)
- `error_message` (text, nullable)
- `created_at` (timestamptz)

Notes:
- Keep model minimal and aligned with existing frontmatter used by `src/content/config.ts`.
- `slug` controls git file path stability.

---

## 5. Markdown Generation Contract

Publish function must produce files compatible with current collection schema:
- required frontmatter: `title`, `published`
- optional but recommended: `description`, `image`, `tags`, `draft`, `lang`, `updated`

Output path rule:
- `src/content/posts/${slug}.md`

Determinism rules:
- Stable field order in frontmatter
- UTF-8 encoding
- Normalize line endings and trailing newline

---

## 6. Git Commit Strategy

- Branch target: `main` (single admin decision)
- Commit granularity: one publish action -> one commit
- Commit message format (example): `feat(content): publish <slug>`
- Update existing file if slug already exists, create new file otherwise
- Return commit SHA to UI and store to `publish_logs`

Failure handling:
- If Git write fails, keep draft content intact in Supabase and mark status `publish_failed`.
- Surface actionable error in admin UI and allow retry.

---

## 7. Deployment & Runtime Boundaries

- Public blog runtime remains static (no Supabase calls for post rendering).
- Supabase usage occurs only in admin workflows.
- Existing `pnpm build` pipeline remains source-compatible because content still lands in `src/content/posts`.

---

## 8. Incremental Rollout Plan (design-level)

1. Add auth-gated admin shell (`/admin/login`, `/admin`).
2. Add draft persistence tables + RLS.
3. Implement draft CRUD UI.
4. Implement publish API + GitHub commit integration.
5. Add publish logs view and retry affordance.
6. Run end-to-end validation with one sample post.

---

## 9. Acceptance Criteria

- Unauthenticated users cannot access `/admin` pages or publish API.
- Admin can create/update draft in Supabase.
- Clicking publish creates/updates Markdown file in `main` under `src/content/posts`.
- Deployment is triggered and published post appears on public site after build.
- Public site can still function if Supabase is unavailable.
- Publish action yields persisted audit log with status and commit SHA/error.
