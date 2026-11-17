import type { APIRoute } from 'astro';
import { logout } from '../../../lib/auth';

export const prerender = false;
// Solo POST: evita cierres de sesión por enlaces o imágenes de terceros.
export const POST: APIRoute = ({ request, locals }) => logout(request, locals.db);
