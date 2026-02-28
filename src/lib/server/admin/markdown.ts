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
		"",
	].join("\n");
}
