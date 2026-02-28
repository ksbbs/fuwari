import test from "node:test";
import assert from "node:assert/strict";
import { buildRepoPath, toBase64Content } from "../../src/lib/server/admin/github.ts";

test("repo path is mapped to content posts", () => {
	assert.equal(buildRepoPath("hello-world"), "src/content/posts/hello-world.md");
});

test("content is base64 encoded", () => {
	assert.equal(toBase64Content("abc"), "YWJj");
});
