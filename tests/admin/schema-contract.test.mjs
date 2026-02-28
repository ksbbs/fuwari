import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const sql = fs.readFileSync("supabase/migrations/20260228_admin_drafts.sql", "utf8");

test("migration includes draft_posts and publish_logs", () => {
	assert.match(sql, /create table\s+if not exists\s+public\.draft_posts/i);
	assert.match(sql, /create table\s+if not exists\s+public\.publish_logs/i);
});

test("migration enables RLS", () => {
	assert.match(sql, /alter table\s+public\.draft_posts\s+enable row level security/i);
	assert.match(sql, /alter table\s+public\.publish_logs\s+enable row level security/i);
});
