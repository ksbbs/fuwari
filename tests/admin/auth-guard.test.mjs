import test from "node:test";
import assert from "node:assert/strict";
import { shouldProtectPath } from "../../src/lib/server/admin/auth.ts";

test("admin routes are protected", () => {
	assert.equal(shouldProtectPath("/admin"), true);
	assert.equal(shouldProtectPath("/admin/posts/1"), true);
	assert.equal(shouldProtectPath("/posts/abc"), false);
});
