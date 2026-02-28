import { defineMiddleware } from "astro:middleware";
import { shouldProtectPath } from "./lib/server/admin/auth";

export const onRequest: ReturnType<typeof defineMiddleware> = defineMiddleware(async (context, next) => {
	if (shouldProtectPath(context.url.pathname)) {
		// 未登录 -> redirect('/admin/login')
		// TODO: implement session check
	}
	return next();
});