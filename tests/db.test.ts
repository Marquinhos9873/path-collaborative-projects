import { describe, it, expect, beforeEach } from 'vitest';
import { makeDb } from './d1-shim';
import { uniqueSlug, createTeam, listTeams, updateTeam, getTeamBySlug, upsertOAuthUser, getUserByHandle, updateUser, listUsers, createProject, listProjects, setEstado } from '../src/lib/db';
import { Forbidden, type NewTeam } from '../src/lib/types';

const base: NewTeam = { nombre: 'APU Space', tipo: 'equipo', pais: 'pe', area: 'aeroespacial', modalidad: 'presencial', nivel: 'pregrado', reclutando: 'si', ciclo_anual: null, proxima_apertura: null, abierto_a_externos: 'por_confirmar', resumen: 'Cohetes', readme: '', enlace: null };
let db: D1Database;
let u1: string, u2: string;
beforeEach(async () => {
  db = makeDb();
  u1 = (await upsertOAuthUser(db, { proveedor: 'github', id_proveedor: '1', email: 'a@x.com', nombre: 'Ana Pérez' })).id;
  u2 = (await upsertOAuthUser(db, { proveedor: 'github', id_proveedor: '2', email: null, nombre: 'Ana Pérez' })).id;
});

describe('uniqueSlug', () => {
  it('sufija -2 para el mismo nombre', async () => {
    expect(await uniqueSlug(db, 'teams', 'APU Space')).toBe('apu-space');
    const t = await createTeam(db, u1, base);
    expect(t.slug).toBe('apu-space');
    expect(await uniqueSlug(db, 'teams', 'APU Space')).toBe('apu-space-2');
    const t2 = await createTeam(db, u2, base);
    expect(t2.slug).toBe('apu-space-2');
    expect((await getTeamBySlug(db, 'apu-space'))!.id).toBe(t.id);
  });
  it('normaliza acentos y símbolos', async () => {
    expect(await uniqueSlug(db, 'teams', 'Año Ñandú & Co!')).toBe('ano-nandu-co');
  });
});

describe('equipos', () => {
  it('listTeams omite hidden y filtra', async () => {
    const a = await createTeam(db, u1, base);
    await createTeam(db, u1, { ...base, nombre: 'Otro', pais: 'mx' });
    await setEstado(db, 'teams', a.id, 'hidden');
    const r = await listTeams(db, {});
    expect(r.items.map((t) => t.nombre)).toEqual(['Otro']);
    expect(await getTeamBySlug(db, 'apu-space')).toBeNull();
    expect((await listTeams(db, { pais: 'zz' })).total).toBe(0);
    expect((await listTeams(db, { pais: 'mx' })).total).toBe(1);
    expect((await listTeams(db, { q: "%'; DROP TABLE teams;--" })).total).toBe(0);
    expect((await listTeams(db, { q: 'otr' })).total).toBe(1);
  });
  it('updateTeam lanza Forbidden con otro dueño', async () => {
    const t = await createTeam(db, u1, base);
    await expect(updateTeam(db, t.id, u2, { nombre: 'Hack' })).rejects.toBeInstanceOf(Forbidden);
    const ok = await updateTeam(db, t.id, u1, { resumen: 'Nuevo' });
    expect(ok.resumen).toBe('Nuevo');
    expect(ok.slug).toBe('apu-space');
  });
  it('pagina de 20 en 20', async () => {
    for (let i = 0; i < 25; i++) await createTeam(db, u1, { ...base, nombre: `Eq ${i}` });
    const p2 = await listTeams(db, { page: 2 });
    expect(p2.total).toBe(25);
    expect(p2.items.length).toBe(5);
    expect(p2.pageSize).toBe(20);
  });
});

describe('usuarios y proyectos', () => {
  it('handles únicos y habilidades como arreglo', async () => {
    const a = await getUserByHandle(db, 'ana-perez');
    const b = await getUserByHandle(db, 'ana-perez-2');
    expect(a && b).toBeTruthy();
    const up = await updateUser(db, u1, { habilidades: ['python', 'pcb'], carrera: 'Electrónica', pais: 'pe' });
    expect(up.habilidades).toEqual(['python', 'pcb']);
    expect((await listUsers(db, { pais: 'pe' })).total).toBe(1);
  });
  it('proyectos con perfiles_buscados', async () => {
    const p = await createProject(db, u1, { nombre: 'Cubesat', team_id: null, resumen: 'x', perfiles_buscados: ['firmware'], area: null, pais: 'pe', readme: '', enlace: null });
    expect(p.perfiles_buscados).toEqual(['firmware']);
    expect((await listProjects(db, { pais: 'pe' })).items).toHaveLength(1);
  });
});
