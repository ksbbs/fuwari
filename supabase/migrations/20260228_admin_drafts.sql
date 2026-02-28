create table if not exists public.draft_posts (
	id uuid primary key default gen_random_uuid(),
	slug text not null unique,
	title text not null,
	description text not null default '',
	body_markdown text not null default '',
	tags text[] not null default '{}',
	published_at timestamptz,
	status text not null default 'draft',
	last_published_commit_sha text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists public.publish_logs (
	id uuid primary key default gen_random_uuid(),
	draft_post_id uuid not null references public.draft_posts(id) on delete cascade,
	slug text not null,
	status text not null,
	commit_sha text,
	error_message text,
	created_at timestamptz not null default now()
);

alter table public.draft_posts enable row level security;
alter table public.publish_logs enable row level security;

create policy "admin draft read" on public.draft_posts for select using (auth.uid() is not null);
create policy "admin draft write" on public.draft_posts for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "admin logs read" on public.publish_logs for select using (auth.uid() is not null);
create policy "admin logs write" on public.publish_logs for all using (auth.uid() is not null) with check (auth.uid() is not null);
