# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目与工具链

- 框架：Astro 5（静态站点输出）+ Svelte 5 组件岛
- 样式：Tailwind CSS + Stylus 变量体系
- 包管理器：`pnpm`（`packageManager: pnpm@9.14.4`）
- Node 版本：README 要求 Node.js 18+
- 代码规范：Biome（格式化 + lint）
- 关键构建特性：`pnpm build` 会先运行图片 CDN 替换脚本，再执行 Astro 构建。

## 常用开发命令

在仓库根目录执行：

- 安装依赖：`pnpm install`
- 启动开发：`pnpm dev`（同 `pnpm start`）
- 生产构建：`pnpm build`
- 本地预览构建产物：`pnpm preview`
- 类型检查：`pnpm type-check`
- 代码格式化（仅 src）：`pnpm format`
- 代码检查并自动修复（仅 src）：`pnpm lint`

内容/站点维护脚本：

- 新建文章：`pnpm new-post <slug>`
- 清理未引用内容图：`pnpm clean`
- 规范化文章图片文件名：`pnpm del-space`
- 修复相邻图片空行（支持只检查）：`pnpm imgf` / `pnpm imgf --check`
- 仅执行图片 CDN 链接替换：`pnpm cdnify`
- 生成文章 git 历史 JSON：`node scripts/update-diff.js`

### 关于测试

- 后台管理模块使用 Node.js 内置 test runner：`pnpm test:admin`
- 运行单个后台测试：`node --test tests/admin/<file>.test.mjs`
- 站点通用验证仍以 `pnpm type-check` + `pnpm lint` + `pnpm build` 为主。

## 高层架构（Big Picture）

### 1) 配置中心（站点行为从配置驱动）

- 主配置在 `src/config.ts`：站点元信息、导航、个人资料、主题、TOC、评论/统计开关、GitHub 编辑链接等。
- 类型定义在 `src/types/config.ts`，常量在 `src/constants/constants.ts`。
- 多数 UI/SEO/行为（如 banner、toc、umami、license）都由配置透传到布局和组件，不要在页面里硬编码。

### 2) 内容模型与内容源

- Astro Content Collection 定义在 `src/content/config.ts`：`posts` 与 `spec` 两个集合。
- 博客正文位于 `src/content/posts/**`（Markdown/MDX），frontmatter 字段在 collection schema 中约束（`published/updated/draft/tags/pinned/...`）。
- `src/utils/content-utils.ts#getSortedPosts()` 是文章列表与上一篇/下一篇关系的核心：
  - 生产环境自动过滤 draft；
  - 先按 pinned，再按发布时间排序；
  - 同时写入 `prevSlug/nextSlug` 供详情页导航使用。

### 3) 路由与页面生成

- 列表分页入口：`src/pages/[...page].astro`（含多种排序模式 + paginate）。
- 文章详情页：`src/pages/posts/[...slug].astro`（渲染正文、元信息、目录、评论、修订历史、结构化数据）。
- Feed/SEO 路由：`src/pages/rss.xml.ts`、`src/pages/sitemap.xml.ts`、`src/pages/robots.txt.ts`。
- 额外独立页面如 `archive/friends/gallery/sponsors/cover` 在 `src/pages/` 下。

### 4) 布局骨架与组件分层

- 全局文档壳：`src/layouts/Layout.astro`（head/meta、全局资源、主题变量、全局脚本入口）。
- 主网格布局：`src/layouts/MainGridLayout.astro`（Navbar、Sidebar、主内容、Footer、TOC、BackToTop）。
- 页面通过 Astro 组件组合，交互细节（如搜索/高亮等）由 Svelte 组件承担。

### 5) Markdown 渲染管线（这是项目定制重点）

- `astro.config.mjs` 同时配置了大量 remark/rehype 插件与 Astro 集成：
  - remark：数学公式、摘要、阅读时长、GitHub admonition、directive、sectionize、自定义 spoiler 等。
  - rehype：Katex、slug、外链处理、指令组件渲染、AI admonition、广告注入、图片 fallback 等。
- 自定义插件集中在 `src/plugins/`，是内容渲染行为（提示块、卡片、广告、fallback）的主要扩展点。

### 6) 文章修订历史功能链路

- `scripts/update-diff.js` 扫描 `src/content/posts` 并调用 git log，生成 `src/json/git-history.json`。
- `src/utils/git-history.ts` 在构建/渲染时读取该 JSON，并为文章页提供 commit 历史与 commit URL。
- 文章页 (`src/pages/posts/[...slug].astro`) 消费该数据展示“修订历史”。
- 修改该功能时要同时考虑脚本、JSON 产物、页面渲染三段链路。

## 代码协作约定（从仓库现有文件提炼）

- 提交信息遵循 `feat/fix/docs/style/refactor` 等前缀风格（见 `CONTRIBUTING.md`）。
- 该仓库包含 `pnpm-lock.yaml`，并通过 `postinstall` 执行 `patch-package`；涉及依赖变更时要检查 `patches/astro.patch` 是否仍然兼容。
- 当前仓库未发现 `.cursorrules`、`.cursor/rules/`、`.github/copilot-instructions.md` 额外规则文件。

## 后台管理（Serverless Admin）

### 架构概览

草稿存储在 Supabase，发布时通过 GitHub Contents API 将 Markdown 提交到 `main`。前台渲染链路不变，不在运行时读取 Supabase。

### 关键路径

- 后台页面：`src/pages/admin/*`
- 后台 API：`src/pages/api/admin/*`
- 服务端逻辑：`src/lib/server/admin/*`
- Supabase 迁移：`supabase/migrations/`
- 后台测试：`tests/admin/*.test.mjs`

### 后台命令

- 运行后台测试：`pnpm test:admin`
- 单个测试：`node --test tests/admin/<file>.test.mjs`

### 后台改动验证顺序

1. `pnpm type-check`
2. `pnpm lint`
3. `pnpm build`
4. `pnpm test:admin`

### 所需环境变量

`PUBLIC_SUPABASE_URL`、`PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`、`GITHUB_TOKEN`、`GITHUB_OWNER`、`GITHUB_REPO`、`GITHUB_BRANCH`（默认 main）、`ADMIN_EMAIL`