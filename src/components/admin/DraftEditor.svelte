<script lang="ts">
	interface Props {
		draft?: {
			id?: string;
			title?: string;
			slug?: string;
			description?: string;
			body_markdown?: string;
			tags?: string[];
		};
	}

	let { draft = {} } = $props<Props>();

	let title = $state(draft.title ?? "");
	let slug = $state(draft.slug ?? "");
	let description = $state(draft.description ?? "");
	let bodyMarkdown = $state(draft.body_markdown ?? "");
	let tagsInput = $state((draft.tags ?? []).join(", "));

	async function handleSave() {
		const tags = tagsInput
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);

		const payload = {
			title,
			slug,
			description,
			body_markdown: bodyMarkdown,
			tags,
		};

		// TODO: Implement actual save to API
		console.log("Saving draft:", payload);
	}
</script>

<div class="draft-editor">
	<div class="field">
		<label for="title">标题</label>
		<input type="text" id="title" bind:value={title} />
	</div>

	<div class="field">
		<label for="slug">Slug</label>
		<input type="text" id="slug" bind:value={slug} />
	</div>

	<div class="field">
		<label for="description">摘要</label>
		<textarea id="description" bind:value={description}></textarea>
	</div>

	<div class="field">
		<label for="tags">标签（逗号分隔）</label>
		<input type="text" id="tags" bind:value={tagsInput} />
	</div>

	<div class="field">
		<label for="body">正文（Markdown）</label>
		<textarea id="body" rows={20} bind:value={bodyMarkdown}></textarea>
	</div>

	<div class="actions">
		<button type="button" onclick={handleSave}>保存草稿</button>
	</div>
</div>

<style>
	.draft-editor {
		max-width: 800px;
		margin: 0 auto;
		padding: 1rem;
	}

	.field {
		margin-bottom: 1rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: bold;
	}

	input,
	textarea {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}

	.actions {
		margin-top: 1rem;
	}

	button {
		padding: 0.5rem 1rem;
		background: #007bff;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	button:hover {
		background: #0056b3;
	}
</style>
