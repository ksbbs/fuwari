import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDraftInput } from "../../src/pages/api/admin/drafts/index.ts";

test("draft input requires title and slug", () => {
	assert.throws(() => normalizeDraftInput({ title: "", slug: "" }));
});
