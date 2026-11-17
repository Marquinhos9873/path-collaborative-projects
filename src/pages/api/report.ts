import type { APIRoute } from 'astro';

export const prerender = false;

const KINDS = ['team', 'project', 'user'] as const;
const TABLES = { team: 'teams', project: 'projects', user: 'users' } as const;
export const MAX_MOTIVO = 500;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return json({ error: 'no_autenticado' }, 401);
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'cuerpo_invalido' }, 400);
  }
  const { kind, id } = body ?? {};
  const motivo = typeof body?.motivo === 'string' ? body.motivo.trim() : '';
  if (!KINDS.includes(kind)) return json({ error: 'kind_invalido' }, 400);
  if (typeof id !== 'string' || id.length === 0 || id.length > 64) return json({ error: 'id_invalido' }, 400);
  if (motivo.length === 0 || motivo.length > MAX_MOTIVO) return json({ error: 'motivo_invalido' }, 400);

  const exists = await locals.db
    .prepare(`SELECT 1 AS ok FROM ${TABLES[kind as (typeof KINDS)[number]]} WHERE id = ?`)
    .bind(id)
    .first();
  if (!exists) return json({ error: 'no_encontrado' }, 404);

  await locals.db
    .prepare('INSERT INTO reports (id, kind, target_id, motivo, reporter_id, creado, resuelto) VALUES (?, ?, ?, ?, ?, ?, 0)')
    .bind(crypto.randomUUID(), kind, id, motivo, locals.user.id, new Date().toISOString())
    .run();
  return new Response(null, { status: 204 });
};
