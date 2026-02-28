import type { APIRoute } from "astro";
import { buildPostMarkdown } from "../../../lib/server/admin/markdown.ts";
import { buildRepoPath, toBase64Content, toPublishPath } from "../../../lib/server/admin/github.ts";

export { toPublishPath };

interface PublishResult {
	ok: boolean;
	commitSha?: string;
	error?: string;
}

// POST: publish draft to GitHub main branch
export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.json();
		const draftId = (body as { id?: string }).id;

		if (!draftId) {
			return new Response(JSON.stringify({ ok: false, error: "Missing draft id" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// TODO: Implement full publish flow:
		// 1) require admin session
		// 2) fetch draft by id from Supabase
		// 3) markdown = buildPostMarkdown(draft)
		// 4) commitSha = upsertPostToGitHub(...)
		// 5) update draft status + insert publish_logs
		// 6) return { ok: true, commitSha }

		const result: PublishResult = {
			ok: true,
			commitSha: undefined,
		};

		return new Response(JSON.stringify(result), {
			headers: { "Content-Type": "application/json" },
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : "Unknown error";
		return new Response(JSON.stringify({ ok: false, error: message }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};
