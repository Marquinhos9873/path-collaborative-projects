import { describe, it, expect, beforeEach } from 'vitest';
import { makeDb } from './d1-shim';
import { upsertOAuthUser } from '../src/lib/db';
import { createSession, getSession, sha256Hex, oauthAvailable, isAdmin, startLogin, finishLogin, cookieHeader, readCookie } from '../src/lib/auth';

let db: D1Database;
let userId: string;
beforeEach(async () => {
  db = makeDb();
  userId = (await upsertOAuthUser(db, { proveedor: 'google', id_proveedor: 'g1', email: 'Admin@Ejemplo.com', nombre: 'Ada' })).id;
});

describe('sesiones', () => {
  it('cookie inválida, ausente o expirada da null', async () => {
    expect(await getSession(db, undefined)).toBeNull();
    expect(await getSession(db, 'x'.repeat(43))).toBeNull();
    const { token } = await createSession(db, userId);
    expect((await getSession(db, token))?.user.id).toBe(userId);
    await db.prepare('UPDATE sessions SET expira = ?').bind(new Date(Date.now() - 1000).toISOString()).run();
    expect(await getSession(db, token)).toBeNull();
  });
  it('guarda solo el hash SHA-256 del token', async () => {
    const { token } = await createSession(db, userId);
    const row = await db.prepare('SELECT id FROM sessions').first<{ id: string }>();
    expect(row!.id).toBe(await sha256Hex(token));
    expect(row!.id).not.toBe(token);
  });
  it('oculta usuarios ocultos', async () => {
    const { token } = await createSession(db, userId);
    await db.prepare("UPDATE users SET estado='hidden'").run();
    expect(await getSession(db, token)).toBeNull();
  });
});

describe('oauth', () => {
  const full = { GITHUB_CLIENT_ID: 'i', GITHUB_CLIENT_SECRET: 's' };
  it('oauthAvailable falso sin secretos', () => {
    expect(oauthAvailable({})).toBe(false);
    expect(oauthAvailable(undefined)).toBe(false);
    expect(oauthAvailable({ GITHUB_CLIENT_ID: 'i' })).toBe(false);
    expect(oauthAvailable(full)).toBe(true);
  });
  it('sin secretos el login redirige a /entrar?error=no_disponible', async () => {
    const r = await startLogin(new Request('https://x.dev/api/auth/github/login'), {}, 'github');
    expect(r.status).toBe(302);
    expect(r.headers.get('location')).toBe('/entrar?error=no_disponible');
    const r2 = await startLogin(new Request('https://x.dev/api/auth/otro/login'), full, 'otro');
    expect(r2.headers.get('location')).toBe('/entrar?error=no_disponible');
  });
  it('con secretos redirige al proveedor con state y cookie segura', async () => {
    const r = await startLogin(new Request('https://x.dev/api/auth/github/login'), full, 'github');
    const loc = new URL(r.headers.get('location')!);
    expect(loc.host).toBe('github.com');
    const state = loc.searchParams.get('state')!;
    const set = r.headers.getSetCookie().join('\n');
    expect(set).toContain(`path_oauth_state=${state}`);
    expect(set).toMatch(/HttpOnly; Secure; SameSite=Lax/);
  });
  it('state distinto al de la cookie responde 400', async () => {
    const req = new Request('https://x.dev/api/auth/github/callback?code=c&state=malo', { headers: { cookie: 'path_oauth_state=bueno' } });
    expect((await finishLogin(req, full, db, 'github')).status).toBe(400);
    const sin = new Request('https://x.dev/api/auth/github/callback?code=c&state=malo');
    expect((await finishLogin(sin, full, db, 'github')).status).toBe(400);
  });
  it('callback sin secretos redirige, no 500', async () => {
    const r = await finishLogin(new Request('https://x.dev/api/auth/github/callback?code=c&state=s'), {}, db, 'github');
    expect(r.headers.get('location')).toBe('/entrar?error=no_disponible');
  });
});

describe('utilidades', () => {
  it('isAdmin compara ADMIN_EMAIL sin distinguir mayúsculas', async () => {
    const u = (await db.prepare('SELECT * FROM users').first()) as any;
    expect(isAdmin(u, { ADMIN_EMAIL: 'admin@ejemplo.com' })).toBe(true);
    expect(isAdmin(u, { ADMIN_EMAIL: 'otro@x.com' })).toBe(false);
    expect(isAdmin(u, {})).toBe(false);
    expect(isAdmin(null, { ADMIN_EMAIL: 'a' })).toBe(false);
  });
  it('cookies', () => {
    expect(cookieHeader('a', 'b')).toBe('a=b; Path=/; HttpOnly; Secure; SameSite=Lax');
    expect(readCookie('x=1; a=b%20c', 'a')).toBe('b c');
  });
});
