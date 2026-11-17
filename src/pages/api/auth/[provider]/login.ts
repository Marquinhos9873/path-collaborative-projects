import type { APIRoute } from 'astro';
import { startLogin } from '../../../../lib/auth';

export const prerender = false;
export const GET: APIRoute = ({ request, params, locals }) =>
  startLogin(request, (locals as any).runtime?.env, params.provider ?? '');
