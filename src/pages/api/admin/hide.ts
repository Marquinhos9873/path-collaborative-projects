import type { APIRoute } from 'astro';
import { isAdmin } from '../../../lib/auth';
import { setEstado } from '../../../lib/db';

export const prerender = false;

const TABLES = { team: 'teams', project: 'projects', user: 'users' } as const;
type Kind = keyof typeof TABLES;

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env ?? {};
  if (!locals.user || !isAdmin(locals.user, env)) return new Response(null, { status: 403 });

  const isForm = (request.headers.get('content-type') ?? '').includes('form');
  let kind: unknown, id: unknown;
  try {
    if (isForm) {
      const f = await request.formData();
      kind = f.get('kind');
      id = f.get('id');
    } else {
      ({ kind, id } = await request.json());
    }
  } catch {
    return new Response(null, { status: 400 });
  }
  if (typeof kind !== 'string' || !(kind in TABLES) || typeof id !== 'string' || !id || id.length > 64) {
    return new Response(null, { status: 400 });
  }
  await setEstado(locals.db, TABLES[kind as Kind], id, 'hidden');
  await locals.db.prepare('UPDATE reports SET resuelto = 1 WHERE kind = ? AND target_id = ?').bind(kind, id).run();

  return isForm
    ? new Response(null, { status: 303, headers: { location: '/admin' } })
    : new Response(null, { status: 204 });
};
