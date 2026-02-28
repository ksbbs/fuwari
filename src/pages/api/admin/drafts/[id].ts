import type { APIRoute } from "astro";

export const prerender = false;

// GET: fetch single draft by id
export const GET: APIRoute = async ({ params }) => {
	const id = params.id;
	if (!id) {
		return new Response(JSON.stringify({ error: "Missing id" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}
	// TODO: Fetch draft from Supabase by id
	return new Response(JSON.stringify({ id }), {
		headers: { "Content-Type": "application/json" },
	});
};

// PATCH: update draft
export const PATCH: APIRoute = async ({ params, request }) => {
	const id = params.id;
	if (!id) {
		return new Response(JSON.stringify({ error: "Missing id" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}
	try {
		const body = await request.json();
		// TODO: Update draft in Supabase
		return new Response(JSON.stringify({ id, ...body }), {
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

// DELETE: remove draft
export const DELETE: APIRoute = async ({ params }) => {
	const id = params.id;
	if (!id) {
		return new Response(JSON.stringify({ error: "Missing id" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}
	// TODO: Delete draft from Supabase
	return new Response(JSON.stringify({ success: true }), {
		headers: { "Content-Type": "application/json" },
	});
};
