import test from "node:test";
import assert from "node:assert/strict";
import { ADMIN_ROUTES_PREFIX } from "../../src/lib/server/admin/constants.ts";

test("admin route prefix is stable", () => {
	assert.equal(ADMIN_ROUTES_PREFIX, "/admin");
});
