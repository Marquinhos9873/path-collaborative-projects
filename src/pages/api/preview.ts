import type { APIRoute } from 'astro';
import { renderReadme } from '../../lib/markdown';
import { ReadmeTooLong } from '../../lib/types';

export const prerender = false;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return json({ error: 'no_autenticado' }, 401);
  let md: unknown;
  try {
    md = (await request.json())?.md;
  } catch {
    return json({ error: 'cuerpo_invalido' }, 400);
  }
  if (typeof md !== 'string') return json({ error: 'md_invalido' }, 400);
  try {
    return json({ html: renderReadme(md) }, 200);
  } catch (e) {
    if (e instanceof ReadmeTooLong) return json({ error: 'readme_demasiado_largo' }, 413);
    throw e;
  }
};
