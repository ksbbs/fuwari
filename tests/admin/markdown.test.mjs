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
		published_at: "2026-02-28T10:00:00.000Z",
	});

	assert.match(out, /^---\ntitle: Hello\npublished:/);
	assert.match(out, /tags: \[a, b\]/);
	assert.match(out, /\n---\n\n# Hi\n$/);
});
