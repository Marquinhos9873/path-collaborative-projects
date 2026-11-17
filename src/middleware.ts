import { defineMiddleware } from 'astro:middleware';
import { getSession, readCookie, SESSION_COOKIE } from './lib/auth';

export const onRequest = defineMiddleware(async (ctx, next) => {
  const db = (ctx.locals as any).runtime?.env?.DB as D1Database | undefined;
  ctx.locals.db = db as D1Database;
  ctx.locals.user = null;
  const token = readCookie(ctx.request.headers.get('cookie'), SESSION_COOKIE);
  if (db && token) {
    try { ctx.locals.user = (await getSession(db, token))?.user ?? null; } catch { ctx.locals.user = null; }
  }
  return next();
});
