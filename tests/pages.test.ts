// Renderiza las páginas con el Container API de Astro, usando el D1 de prueba (sqlite en memoria).
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';
import { getViteConfig } from 'astro/config';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { makeDb } from './d1-shim';
import { createTeam, upsertOAuthUser, setEstado } from '../src/lib/db';
import type { NewTeam, User } from '../src/lib/types';

const team: NewTeam = { nombre: 'APU Space', tipo: 'equipo', pais: 'pe', area: 'aeroespacial', modalidad: 'presencial', nivel: 'pregrado', reclutando: 'si', ciclo_anual: null, proxima_apertura: null, abierto_a_externos: 'por_confirmar', resumen: 'Cohetes universitarios', readme: '# Hola\n\nSomos **APU**.', enlace: 'https://apu.example' };

let server: ViteDevServer;
let container: Awaited<ReturnType<typeof AstroContainer.create>>;
let db: D1Database;
let owner: User;
let other: User;

async function page(path: string, opts: { user?: User | null; method?: string; form?: Record<string, string>; route?: string; params?: Record<string, string> } = {}) {
  const url = new URL(path, 'http://localhost');
  const mod = await server.ssrLoadModule(opts.route ?? '/src/pages/explorar.astro');
  const body = opts.form ? new URLSearchParams(opts.form) : undefined;
  const request = new Request(url, { method: opts.method ?? 'GET', body, headers: body ? { 'content-type': 'application/x-www-form-urlencoded', origin: url.origin } : {} });
  return container.renderToResponse(mod.default, { request, params: opts.params, locals: { db, user: opts.user ?? null }, routeType: 'page' } as any);
}

beforeAll(async () => {
  const cfg = await getViteConfig({ server: { middlewareMode: true }, appType: 'custom' }, { adapter: undefined, output: 'server' } as any)({ mode: 'test', command: 'serve' });
  server = await createServer({ ...cfg, configFile: false, root: process.cwd() } as any);
  container = await AstroContainer.create();
}, 60000);
afterAll(async () => { await server?.close(); });

beforeEach(async () => {
  db = makeDb();
  owner = await upsertOAuthUser(db, { proveedor: 'github', id_proveedor: '1', email: null, nombre: 'Ana Pérez' });
  other = await upsertOAuthUser(db, { proveedor: 'github', id_proveedor: '2', email: null, nombre: 'Luis Gómez' });
});

describe('explorar', () => {
  it('parámetros inválidos o sin resultados: 200 con EmptyState', async () => {
    const r = await page('/explorar?pais=zz&area=%3Cx%3E&nivel=%3Cx%3E&tab=raro&page=-4');
    expect(r.status).toBe(200);
    const html = await r.text();
    expect(html).toContain('No encontramos nada');
    expect(html).not.toContain('<x>');
  });
  it('lista equipos y no los ocultos', async () => {
    const a = await createTeam(db, owner.id, team);
    await createTeam(db, owner.id, { ...team, nombre: 'Visible Uno' });
    await setEstado(db, 'teams', a.id, 'hidden');
    const html = await (await page('/explorar')).text();
    expect(html).toContain('Visible Uno');
    expect(html).not.toContain('APU Space');
  });
  it('las pestañas proyectos y personas responden 200', async () => {
    expect((await page('/explorar?tab=proyectos')).status).toBe(200);
    const r = await page('/explorar?tab=personas');
    expect(r.status).toBe(200);
    expect(await r.text()).toContain('Ana Pérez');
  });
});

describe('fichas', () => {
  const route = '/src/pages/equipos/[slug].astro';
  it('equipo inexistente -> 404', async () => {
    expect((await page('/equipos/nada', { route, params: { slug: 'nada' } })).status).toBe(404);
  });
  it('equipo hidden -> 404', async () => {
    const t = await createTeam(db, owner.id, team);
    await setEstado(db, 'teams', t.id, 'hidden');
    expect((await page('/equipos/apu-space', { route, params: { slug: 'apu-space' } })).status).toBe(404);
  });
  it('ficha activa muestra README, enlace seguro y reportar', async () => {
    await createTeam(db, owner.id, team);
    const r = await page('/equipos/apu-space', { route, params: { slug: 'apu-space' } });
    expect(r.status).toBe(200);
    const html = await r.text();
    expect(html).toContain('Ir a su página ↗');
    expect(html).toContain('rel="noopener nofollow"');
    expect(html).toContain('Reportar');
  });
  it('enlace no https no se muestra', async () => {
    await createTeam(db, owner.id, { ...team, enlace: 'javascript:alert(1)' });
    const html = await (await page('/equipos/apu-space', { route, params: { slug: 'apu-space' } })).text();
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('Ir a su página');
  });
  it('persona inexistente -> 404', async () => {
    expect((await page('/u/nadie', { route: '/src/pages/u/[handle].astro', params: { handle: 'nadie' } })).status).toBe(404);
  });
});

describe('cuenta', () => {
  it('sin sesión /cuenta redirige a /entrar', async () => {
    const r = await page('/cuenta', { route: '/src/pages/cuenta/index.astro' });
    expect(r.status).toBe(302);
    expect(r.headers.get('location')).toBe('/entrar');
  });
  it('editar equipo ajeno por POST -> 403 y no cambia nada', async () => {
    const t = await createTeam(db, owner.id, team);
    const r = await page(`/cuenta/equipos/${t.slug}/editar`, { route: '/src/pages/cuenta/equipos/[slug]/editar.astro', params: { slug: t.slug }, user: other, method: 'POST', form: { nombre: 'Hackeado', resumen: 'x' } });
    expect(r.status).toBe(403);
    const row = await db.prepare('SELECT nombre FROM teams WHERE id = ?').bind(t.id).first<{ nombre: string }>();
    expect(row!.nombre).toBe('APU Space');
  });
  it('el dueño edita su equipo', async () => {
    const t = await createTeam(db, owner.id, team);
    const r = await page(`/cuenta/equipos/${t.slug}/editar`, { route: '/src/pages/cuenta/equipos/[slug]/editar.astro', params: { slug: t.slug }, user: owner, method: 'POST', form: { nombre: 'APU Space', resumen: 'Nuevo resumen', tipo: 'equipo' } });
    expect(r.status).toBe(303);
  });
});

describe('entrar', () => {
  it('muestra Google, GitHub y el aviso', async () => {
    const html = await (await page('/entrar?error=no_disponible', { route: '/src/pages/entrar.astro' })).text();
    expect(html).toContain('Entrar con Google');
    expect(html).toContain('Entrar con GitHub');
    expect(html).toContain('Inicio de sesión no disponible');
  });
});
