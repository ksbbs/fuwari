export function buildRepoPath(slug: string): string {
	return `src/content/posts/${slug}.md`;
}

export function toBase64Content(content: string): string {
	return Buffer.from(content, "utf8").toString("base64");
}

export async function upsertPostToGitHub(/* env + slug + markdown */): Promise<string | undefined> {
	// 使用 GitHub Contents API:
	// 1) GET file (拿 sha，可选)
	// 2) PUT file 到 main（含 message/content/sha）
	// 返回 commit sha
	return undefined;
}
