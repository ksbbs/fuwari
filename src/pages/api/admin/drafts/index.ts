import type { APIRoute } from "astro";

export interface NormalizedDraft {
	title: string;
	slug: string;
	description: string;
	body_markdown: string;
	tags: string[];
}

export function normalizeDraftInput(body: unknown): NormalizedDraft {
	if (!body || typeof body !== "object") {
		throw new Error("title and slug required");
	}
	const data = body as Record<string, unknown>;
	if (!data.title || !data.slug) {
		throw new Error("title and slug required");
	}
	return {
		title: String(data.title),
		slug: String(data.slug),
		description: String(data.description ?? ""),
		body_markdown: String(data.body_markdown ?? ""),
		tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
	};
}

// GET: list drafts
export const GET: APIRoute = async () => {
	// TODO: Fetch drafts from Supabase
	return new Response(JSON.stringify([]), {
		headers: { "Content-Type": "application/json" },
	});
};

// POST: create draft
export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.json();
		const draft = normalizeDraftInput(body);
		// TODO: Insert draft into Supabase
		return new Response(JSON.stringify(draft), {
			status: 201,
			headers: { "Content-Type": "application/json" },
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : "Unknown error";
		return new Response(JSON.stringify({ error: message }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}
};
