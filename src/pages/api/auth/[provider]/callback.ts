import type { APIRoute } from 'astro';
import { finishLogin } from '../../../../lib/auth';

export const prerender = false;
export const GET: APIRoute = ({ request, params, locals }) =>
  finishLogin(request, (locals as any).runtime?.env, locals.db, params.provider ?? '');
