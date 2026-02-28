/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
	readonly GITHUB_TOKEN: string;
	readonly GITHUB_OWNER: string;
	readonly GITHUB_REPO: string;
	readonly GITHUB_BRANCH: string;
}
