import { Forbidden } from './types';
import type { Team, Project, User, TeamFilter, ProjectFilter, UserFilter, Page, NewTeam, NewProject, Estado } from './types';

const PAGE_SIZE = 20 as const;
type Table = 'teams' | 'projects' | 'users';

export function slugify(s: string): string {
  const out = s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/g, '');
  return out || 'sin-nombre';
}

export async function uniqueSlug(db: D1Database, table: Table, base: string): Promise<string> {
  const col = table === 'users' ? 'handle' : 'slug';
  const root = slugify(base);
  for (let n = 1; n < 1000; n++) {
    const cand = n === 1 ? root : `${root}-${n}`;
    const hit = await db.prepare(`SELECT 1 AS x FROM ${table} WHERE ${col} = ?`).bind(cand).first();
    if (!hit) return cand;
  }
  return `${root}-${crypto.randomUUID().slice(0, 8)}`;
}

const esc = (q: string) => q.replace(/[\\%_]/g, (c) => '\\' + c);
const pageOf = (f: { page?: number }) => {
  const p = Number(f.page);
  return Number.isFinite(p) && p >= 1 ? Math.min(Math.floor(p), 10000) : 1;
};

function hydrateUser(r: any): User { return { ...r, habilidades: parseList(r.habilidades) }; }
function hydrateProject(r: any): Project { return { ...r, perfiles_buscados: parseList(r.perfiles_buscados) }; }
function parseList(s: unknown): string[] {
  try { const v = JSON.parse(String(s ?? '[]')); return Array.isArray(v) ? v.map(String) : []; } catch { return []; }
}

async function paged<T>(db: D1Database, table: string, where: string[], args: unknown[], page: number, order: string, map: (r: any) => T): Promise<Page<T>> {
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = (await db.prepare(`SELECT COUNT(*) AS n FROM ${table} ${w}`).bind(...args).first<{ n: number }>())?.n ?? 0;
  const rows = await db.prepare(`SELECT * FROM ${table} ${w} ORDER BY ${order} LIMIT ? OFFSET ?`).bind(...args, PAGE_SIZE, (page - 1) * PAGE_SIZE).all();
  return { items: (rows.results as any[]).map(map), total, page, pageSize: PAGE_SIZE };
}

// ---------- equipos ----------
export async function listTeams(db: D1Database, f: TeamFilter): Promise<Page<Team>> {
  const where = ["estado = 'active'"]; const a: unknown[] = [];
  if (f.q) { where.push("(nombre LIKE ? ESCAPE '\\' OR resumen LIKE ? ESCAPE '\\')"); a.push(`%${esc(f.q)}%`, `%${esc(f.q)}%`); }
  for (const k of ['pais', 'area', 'modalidad', 'reclutando'] as const) if (f[k]) { where.push(`${k} = ?`); a.push(f[k]); }
  return paged(db, 'teams', where, a, pageOf(f), "(CASE WHEN pais = 'pe' THEN 0 ELSE 1 END), nombre COLLATE NOCASE", (r) => r as Team);
}

export async function getTeamBySlug(db: D1Database, slug: string): Promise<Team | null> {
  return db.prepare("SELECT * FROM teams WHERE slug = ? AND estado = 'active'").bind(slug).first<Team>();
}
export async function getTeamById(db: D1Database, id: string): Promise<Team | null> {
  return db.prepare('SELECT * FROM teams WHERE id = ?').bind(id).first<Team>();
}
/** Equipos del dueño, incluidos los ocultos (para /cuenta). */
export async function listTeamsByOwner(db: D1Database, ownerId: string): Promise<Team[]> {
  return (await db.prepare('SELECT * FROM teams WHERE owner_id = ? ORDER BY creado DESC').bind(ownerId).all<Team>()).results;
}

const TEAM_COLS = ['nombre', 'tipo', 'pais', 'area', 'modalidad', 'nivel', 'reclutando', 'ciclo_anual', 'proxima_apertura', 'abierto_a_externos', 'resumen', 'readme', 'enlace'] as const;

export async function createTeam(db: D1Database, ownerId: string, input: NewTeam): Promise<Team> {
  const id = crypto.randomUUID();
  const slug = await uniqueSlug(db, 'teams', input.nombre);
  const vals = TEAM_COLS.map((c) => input[c] ?? null);
  await db.prepare(`INSERT INTO teams (id, slug, owner_id, origen, estado, creado, ${TEAM_COLS.join(',')}) VALUES (?,?,?, 'usuario','active',?, ${TEAM_COLS.map(() => '?').join(',')})`)
    .bind(id, slug, ownerId, new Date().toISOString(), ...vals).run();
  return (await getTeamById(db, id))!;
}

export async function updateTeam(db: D1Database, id: string, ownerId: string, patch: Partial<NewTeam>): Promise<Team> {
  const cur = await getTeamById(db, id);
  if (!cur || !cur.owner_id || cur.owner_id !== ownerId) throw new Forbidden();
  const keys = TEAM_COLS.filter((c) => c in patch);
  if (keys.length) {
    await db.prepare(`UPDATE teams SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ? AND owner_id = ?`)
      .bind(...keys.map((k) => (patch as any)[k] ?? null), id, ownerId).run();
  }
  return (await getTeamById(db, id))!;
}

// ---------- proyectos ----------
export async function listProjects(db: D1Database, f: ProjectFilter): Promise<Page<Project>> {
  const where = ["estado = 'active'"]; const a: unknown[] = [];
  if (f.q) { where.push("(nombre LIKE ? ESCAPE '\\' OR resumen LIKE ? ESCAPE '\\')"); a.push(`%${esc(f.q)}%`, `%${esc(f.q)}%`); }
  for (const k of ['pais', 'area'] as const) if (f[k]) { where.push(`${k} = ?`); a.push(f[k]); }
  return paged(db, 'projects', where, a, pageOf(f), 'creado DESC', hydrateProject);
}
export async function getProjectBySlug(db: D1Database, slug: string): Promise<Project | null> {
  const r = await db.prepare("SELECT * FROM projects WHERE slug = ? AND estado = 'active'").bind(slug).first();
  return r ? hydrateProject(r) : null;
}
export async function getProjectById(db: D1Database, id: string): Promise<Project | null> {
  const r = await db.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
  return r ? hydrateProject(r) : null;
}
const PROJECT_COLS = ['nombre', 'team_id', 'resumen', 'perfiles_buscados', 'area', 'pais', 'readme', 'enlace'] as const;
const projVal = (c: string, v: unknown) => (c === 'perfiles_buscados' ? JSON.stringify(v ?? []) : v ?? null);

export async function createProject(db: D1Database, ownerId: string, input: NewProject): Promise<Project> {
  const id = crypto.randomUUID();
  const slug = await uniqueSlug(db, 'projects', input.nombre);
  await db.prepare(`INSERT INTO projects (id, slug, owner_id, estado, creado, ${PROJECT_COLS.join(',')}) VALUES (?,?,?, 'active',?, ${PROJECT_COLS.map(() => '?').join(',')})`)
    .bind(id, slug, ownerId, new Date().toISOString(), ...PROJECT_COLS.map((c) => projVal(c, input[c]))).run();
  return (await getProjectById(db, id))!;
}
export async function updateProject(db: D1Database, id: string, ownerId: string, patch: Partial<NewProject>): Promise<Project> {
  const cur = await getProjectById(db, id);
  if (!cur || !cur.owner_id || cur.owner_id !== ownerId) throw new Forbidden();
  const keys = PROJECT_COLS.filter((c) => c in patch);
  if (keys.length) {
    await db.prepare(`UPDATE projects SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ? AND owner_id = ?`)
      .bind(...keys.map((k) => projVal(k, (patch as any)[k])), id, ownerId).run();
  }
  return (await getProjectById(db, id))!;
}

// ---------- personas ----------
export async function listUsers(db: D1Database, f: UserFilter): Promise<Page<User>> {
  const where = ["estado = 'active'"]; const a: unknown[] = [];
  if (f.q) { where.push("(nombre LIKE ? ESCAPE '\\' OR carrera LIKE ? ESCAPE '\\')"); a.push(`%${esc(f.q)}%`, `%${esc(f.q)}%`); }
  if (f.pais) { where.push('pais = ?'); a.push(f.pais); }
  if (f.carrera) { where.push('carrera = ?'); a.push(f.carrera); }
  if (f.habilidad) { where.push("habilidades LIKE ? ESCAPE '\\'"); a.push(`%${esc(JSON.stringify(f.habilidad).slice(1, -1))}%`); }
  return paged(db, 'users', where, a, pageOf(f), 'creado DESC', hydrateUser);
}
export async function getUserByHandle(db: D1Database, handle: string): Promise<User | null> {
  const r = await db.prepare("SELECT * FROM users WHERE handle = ? AND estado = 'active'").bind(handle).first();
  return r ? hydrateUser(r) : null;
}
export async function getUserById(db: D1Database, id: string): Promise<User | null> {
  const r = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  return r ? hydrateUser(r) : null;
}
const USER_COLS = ['nombre', 'carrera', 'pais', 'nivel', 'habilidades', 'readme', 'enlace'] as const;

export async function updateUser(db: D1Database, id: string, patch: Partial<Pick<User, (typeof USER_COLS)[number]>>): Promise<User> {
  const keys = USER_COLS.filter((c) => c in patch);
  if (keys.length) {
    await db.prepare(`UPDATE users SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`)
      .bind(...keys.map((k) => (k === 'habilidades' ? JSON.stringify((patch as any)[k] ?? []) : (patch as any)[k] ?? null)), id).run();
  }
  return (await getUserById(db, id))!;
}

/** Crea o recupera al usuario por (proveedor, id_proveedor). Usado por el login OAuth. */
export async function upsertOAuthUser(db: D1Database, p: { proveedor: User['proveedor']; id_proveedor: string; email: string | null; nombre: string }): Promise<User> {
  const ex = await db.prepare('SELECT * FROM users WHERE proveedor = ? AND id_proveedor = ?').bind(p.proveedor, p.id_proveedor).first();
  if (ex) return hydrateUser(ex);
  const id = crypto.randomUUID();
  const nombre = (p.nombre || 'Persona').slice(0, 80);
  const handle = await uniqueSlug(db, 'users', nombre);
  await db.prepare('INSERT INTO users (id, proveedor, id_proveedor, email, nombre, handle, creado) VALUES (?,?,?,?,?,?,?)')
    .bind(id, p.proveedor, p.id_proveedor, p.email, nombre, handle, new Date().toISOString()).run();
  return (await getUserById(db, id))!;
}

/** Oculta o reactiva una ficha (admin). */
export async function setEstado(db: D1Database, table: Table, id: string, estado: Estado): Promise<void> {
  await db.prepare(`UPDATE ${table} SET estado = ? WHERE id = ?`).bind(estado, id).run();
}
