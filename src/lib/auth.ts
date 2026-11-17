import { GitHub, Google, decodeIdToken, generateCodeVerifier, generateState } from 'arctic';
import type { User } from './types';
import { getUserById, upsertOAuthUser } from './db';

export const SESSION_COOKIE = 'path_session';
const STATE_COOKIE = 'path_oauth_state';
const VERIFIER_COOKIE = 'path_oauth_verifier';
const NEXT_COOKIE = 'path_oauth_next';
const SESSION_DAYS = 30;

export type Provider = 'google' | 'github';
export const isProvider = (p: unknown): p is Provider => p === 'google' || p === 'github';

type AuthEnv = Partial<Pick<Env, 'ADMIN_EMAIL' | 'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET' | 'GITHUB_CLIENT_ID' | 'GITHUB_CLIENT_SECRET' | 'SITE_URL'>>;

export function providerAvailable(env: AuthEnv | undefined, p: Provider): boolean {
  if (!env) return false;
  return p === 'google' ? !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) : !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
}
export function oauthAvailable(env: AuthEnv | undefined): boolean {
  return providerAvailable(env, 'google') || providerAvailable(env, 'github');
}
export function isAdmin(user: User | null | undefined, env: AuthEnv | undefined): boolean {
  const admin = env?.ADMIN_EMAIL?.trim().toLowerCase();
  return !!(user && admin && user.email && user.email.toLowerCase() === admin);
}

// ---------- sesiones ----------
export async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function randomToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Crea la sesión; devuelve el token en claro (solo viaja en la cookie). En D1 queda su SHA-256. */
export async function createSession(db: D1Database, userId: string): Promise<{ token: string; expires: Date }> {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.prepare('INSERT INTO sessions (id, user_id, expira) VALUES (?,?,?)').bind(await sha256Hex(token), userId, expires.toISOString()).run();
  return { token, expires };
}
export async function deleteSession(db: D1Database, token: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(await sha256Hex(token)).run();
}
export async function getSession(db: D1Database, cookie: string | undefined): Promise<{ user: User } | null> {
  if (!cookie || cookie.length < 20 || cookie.length > 200) return null;
  const s = await db.prepare('SELECT user_id, expira FROM sessions WHERE id = ?').bind(await sha256Hex(cookie)).first<{ user_id: string; expira: string }>();
  if (!s) return null;
  if (new Date(s.expira).getTime() <= Date.now()) {
    await db.prepare('DELETE FROM sessions WHERE id = ?').bind(await sha256Hex(cookie)).run();
    return null;
  }
  const user = await getUserById(db, s.user_id);
  if (!user || user.estado !== 'active') return null;
  return { user };
}

// ---------- cookies ----------
export function cookieHeader(name: string, value: string, opts: { maxAge?: number; expires?: Date } = {}): string {
  let c = `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax`;
  if (opts.maxAge !== undefined) c += `; Max-Age=${opts.maxAge}`;
  if (opts.expires) c += `; Expires=${opts.expires.toUTCString()}`;
  return c;
}
export function readCookie(header: string | null | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) {
      try { return decodeURIComponent(part.slice(i + 1).trim()); } catch { return undefined; }
    }
  }
  return undefined;
}
const clear = (name: string) => cookieHeader(name, '', { maxAge: 0 });
const safeNext = (n: string | undefined) => (n && /^\/(?![/\\])/.test(n) ? n : '/cuenta');

function redirect(location: string, cookies: string[] = []): Response {
  const h = new Headers({ Location: location });
  for (const c of cookies) h.append('Set-Cookie', c);
  return new Response(null, { status: 302, headers: h });
}

function client(env: AuthEnv, p: Provider, origin: string) {
  const redirectUri = `${(env.SITE_URL || origin).replace(/\/$/, '')}/api/auth/${p}/callback`;
  return p === 'google'
    ? new Google(env.GOOGLE_CLIENT_ID!, env.GOOGLE_CLIENT_SECRET!, redirectUri)
    : new GitHub(env.GITHUB_CLIENT_ID!, env.GITHUB_CLIENT_SECRET!, redirectUri);
}

// ---------- flujo OAuth ----------
export async function startLogin(request: Request, env: AuthEnv | undefined, provider: string): Promise<Response> {
  if (!isProvider(provider) || !providerAvailable(env, provider)) return redirect('/entrar?error=no_disponible');
  const url = new URL(request.url);
  const state = generateState();
  const verifier = generateCodeVerifier();
  const c = client(env!, provider, url.origin);
  const auth = provider === 'google'
    ? (c as Google).createAuthorizationURL(state, verifier, ['openid', 'profile', 'email'])
    : (c as GitHub).createAuthorizationURL(state, ['read:user', 'user:email']);
  const cookies = [cookieHeader(STATE_COOKIE, state, { maxAge: 600 }), cookieHeader(NEXT_COOKIE, safeNext(url.searchParams.get('next') ?? undefined), { maxAge: 600 })];
  if (provider === 'google') cookies.push(cookieHeader(VERIFIER_COOKIE, verifier, { maxAge: 600 }));
  return redirect(auth.toString(), cookies);
}

export async function finishLogin(request: Request, env: AuthEnv | undefined, db: D1Database | undefined, provider: string): Promise<Response> {
  if (!isProvider(provider) || !providerAvailable(env, provider) || !db) return redirect('/entrar?error=no_disponible');
  const url = new URL(request.url);
  const cookieHdr = request.headers.get('cookie');
  const stateCookie = readCookie(cookieHdr, STATE_COOKIE);
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  if (!state || !code || !stateCookie || state !== stateCookie) {
    return new Response('Solicitud inválida', { status: 400, headers: { 'Set-Cookie': clear(STATE_COOKIE) } });
  }
  try {
    const c = client(env!, provider, url.origin);
    let profile: { id: string; email: string | null; nombre: string };
    if (provider === 'google') {
      const verifier = readCookie(cookieHdr, VERIFIER_COOKIE);
      if (!verifier) return new Response('Solicitud inválida', { status: 400 });
      const tokens = await (c as Google).validateAuthorizationCode(code, verifier);
      const claims = decodeIdToken(tokens.idToken()) as { sub: string; email?: string; email_verified?: boolean; name?: string };
      profile = { id: claims.sub, email: claims.email_verified ? claims.email ?? null : null, nombre: claims.name || claims.email?.split('@')[0] || 'Persona' };
    } else {
      const tokens = await (c as GitHub).validateAuthorizationCode(code);
      const headers = { Authorization: `Bearer ${tokens.accessToken()}`, 'User-Agent': 'path-hub', Accept: 'application/vnd.github+json' };
      const u = (await (await fetch('https://api.github.com/user', { headers })).json()) as { id: number; login: string; name?: string };
      let email: string | null = null;
      try {
        const emails = (await (await fetch('https://api.github.com/user/emails', { headers })).json()) as { email: string; primary: boolean; verified: boolean }[];
        email = Array.isArray(emails) ? emails.find((e) => e.primary && e.verified)?.email ?? null : null;
      } catch { /* sin correo */ }
      profile = { id: String(u.id), email, nombre: u.name || u.login };
    }
    const user = await upsertOAuthUser(db, { proveedor: provider, id_proveedor: profile.id, email: profile.email, nombre: profile.nombre });
    if (user.estado !== 'active') return redirect('/entrar?error=no_disponible', [clear(STATE_COOKIE)]);
    const { token, expires } = await createSession(db, user.id);
    return redirect(safeNext(readCookie(cookieHdr, NEXT_COOKIE)), [
      cookieHeader(SESSION_COOKIE, token, { expires, maxAge: SESSION_DAYS * 86400 }),
      clear(STATE_COOKIE), clear(VERIFIER_COOKIE), clear(NEXT_COOKIE),
    ]);
  } catch {
    return redirect('/entrar?error=fallo', [clear(STATE_COOKIE), clear(VERIFIER_COOKIE), clear(NEXT_COOKIE)]);
  }
}

export async function logout(request: Request, db: D1Database | undefined): Promise<Response> {
  const token = readCookie(request.headers.get('cookie'), SESSION_COOKIE);
  if (token && db) { try { await deleteSession(db, token); } catch { /* ignorar */ } }
  return redirect('/', [clear(SESSION_COOKIE)]);
}
