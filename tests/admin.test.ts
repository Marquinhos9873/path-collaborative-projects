import { describe, it, expect, beforeEach, vi } from 'vitest';
import { makeDb } from './d1-shim';
import { upsertOAuthUser, createTeam, listTeams } from '../src/lib/db';
import type { NewTeam, User } from '../src/lib/types';

// Aísla estos tests del módulo de auth (lo implementa otro agente); misma firma que el contrato.
vi.mock('../src/lib/auth', () => ({
  isAdmin: (u: User, env: { ADMIN_EMAIL?: string }) => !!env.ADMIN_EMAIL && u.email === env.ADMIN_EMAIL,
}));

import { POST as hide } from '../src/pages/api/admin/hide';
import { POST as report } from '../src/pages/api/report';
import { POST as preview } from '../src/pages/api/preview';

const team: NewTeam = { nombre: 'Equipo X', tipo: 'equipo', pais: 'pe', area: null, modalidad: null, nivel: null, reclutando: 'no', ciclo_anual: null, proxima_apertura: null, abierto_a_externos: 'por_confirmar', resumen: 'x', readme: '', enlace: null };
let db: D1Database, admin: User, normal: User, teamId: string;

const req = (body: unknown) =>
  new Request('http://localhost/x', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const ctx = (user: User | null, body: unknown) =>
  ({ request: req(body), locals: { user, db, runtime: { env: { ADMIN_EMAIL: 'admin@x.com' } } } }) as any;

beforeEach(async () => {
  db = makeDb();
  admin = await upsertOAuthUser(db, { proveedor: 'github', id_proveedor: '1', email: 'admin@x.com', nombre: 'Admin' });
  normal = await upsertOAuthUser(db, { proveedor: 'github', id_proveedor: '2', email: 'u@x.com', nombre: 'Usuario' });
  teamId = (await createTeam(db, normal.id, team)).id;
});

describe('POST /api/admin/hide', () => {
  it('403 sin sesión o sin ser admin', async () => {
    expect((await hide(ctx(null, { kind: 'team', id: teamId }))).status).toBe(403);
    expect((await hide(ctx(normal, { kind: 'team', id: teamId }))).status).toBe(403);
    expect((await listTeams(db, {})).total).toBe(1);
  });
  it('admin oculta la ficha y deja de listarse; resuelve sus reportes', async () => {
    await report(ctx(normal, { kind: 'team', id: teamId, motivo: 'spam' }));
    const r = await hide(ctx(admin, { kind: 'team', id: teamId }));
    expect(r.status).toBe(204);
    expect((await listTeams(db, {})).total).toBe(0);
    const row = await db.prepare('SELECT resuelto FROM reports').first<{ resuelto: number }>();
    expect(row!.resuelto).toBe(1);
  });
  it('400 con kind o id inválidos', async () => {
    expect((await hide(ctx(admin, { kind: 'otra', id: teamId }))).status).toBe(400);
    expect((await hide(ctx(admin, { kind: 'team' }))).status).toBe(400);
  });
});

describe('POST /api/report', () => {
  it('401 sin sesión', async () => {
    expect((await report(ctx(null, { kind: 'team', id: teamId, motivo: 'x' }))).status).toBe(401);
  });
  it('204 y guarda el reporte', async () => {
    expect((await report(ctx(normal, { kind: 'team', id: teamId, motivo: 'Contenido ofensivo' }))).status).toBe(204);
    const row = await db.prepare('SELECT * FROM reports').first<any>();
    expect(row).toMatchObject({ kind: 'team', target_id: teamId, reporter_id: normal.id, resuelto: 0 });
  });
  it('valida kind, id y motivo (máx. 500)', async () => {
    expect((await report(ctx(normal, { kind: 'x', id: teamId, motivo: 'a' }))).status).toBe(400);
    expect((await report(ctx(normal, { kind: 'team', id: 5, motivo: 'a' }))).status).toBe(400);
    expect((await report(ctx(normal, { kind: 'team', id: teamId, motivo: '' }))).status).toBe(400);
    expect((await report(ctx(normal, { kind: 'team', id: teamId, motivo: 'a'.repeat(501) }))).status).toBe(400);
    expect((await report(ctx(normal, { kind: 'team', id: teamId, motivo: 'a'.repeat(500) }))).status).toBe(204);
    expect((await report(ctx(normal, { kind: 'team', id: 'no-existe', motivo: 'a' }))).status).toBe(404);
  });
});

describe('POST /api/preview', () => {
  it('401 sin sesión', async () => {
    expect((await preview(ctx(null, { md: 'hola' }))).status).toBe(401);
  });
  it('devuelve html seguro', async () => {
    const r = await preview(ctx(normal, { md: '**hola** <script>x</script>' }));
    expect(r.status).toBe(200);
    const { html } = await r.json();
    expect(html).toContain('<strong>hola</strong>');
    expect(html).not.toContain('<script');
  });
  it('413 si el README es demasiado largo, 400 si el cuerpo es inválido', async () => {
    expect((await preview(ctx(normal, { md: 'a'.repeat(20001) }))).status).toBe(413);
    expect((await preview(ctx(normal, { md: 5 }))).status).toBe(400);
  });
});
