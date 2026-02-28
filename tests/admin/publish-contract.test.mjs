import test from "node:test";
import assert from "node:assert/strict";
import { toPublishPath } from "../../src/lib/server/admin/github.ts";

test("publish path matches blog content tree", () => {
	assert.equal(toPublishPath("abc"), "src/content/posts/abc.md");
});
