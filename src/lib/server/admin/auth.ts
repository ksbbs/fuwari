export function shouldProtectPath(pathname: string): boolean {
	return pathname === "/admin" || pathname.startsWith("/admin/");
}

export async function requireAdminSession(/* Astro locals/request */): Promise<boolean> {
	// 校验 supabase session + email allowlist
	return false;
}