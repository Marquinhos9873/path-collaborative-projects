// Utilidades de las páginas: validación de parámetros con lista blanca y formularios.
// Prefijo "_" = Astro no lo trata como ruta.
import type { Modalidad, Nivel, NewTeam, Reclutando, TeamFilter, TeamTipo } from '../lib/types';

export const TABS = ['equipos', 'proyectos', 'personas'] as const;
export type Tab = (typeof TABS)[number];

const MODALIDADES: Modalidad[] = ['presencial', 'remoto', 'hibrido'];
const RECLUTANDO: Reclutando[] = ['si', 'no', 'por_confirmar'];
export const NIVELES: Nivel[] = ['pregrado', 'posgrado', 'colegio', 'profesional', 'todos'];
export const TIPOS: TeamTipo[] = ['equipo', 'capitulo', 'laboratorio', 'competencia'];
export const README_MAX = 20000;

export const FACET_PAISES = ['pe', 'xx', 'ar', 'br', 'cl', 'co', 'ec', 'mx', 'us', 'es'];
export const FACET_AREAS = ['electronica', 'aeroespacial', 'software', 'datos', 'robotica', 'ambiental', 'biologia', 'ingenieria'];

export const PAIS_NOMBRE: Record<string, string> = {
  pe: 'Perú', xx: 'Mundial', ar: 'Argentina', br: 'Brasil', cl: 'Chile', co: 'Colombia',
  ec: 'Ecuador', mx: 'México', us: 'Estados Unidos', es: 'España',
};
export const paisNombre = (c: string | null) => (c ? (PAIS_NOMBRE[c] ?? c.toUpperCase()) : '');

const one = (v: string | null) => (v ?? '').trim();

export function parseTab(p: URLSearchParams): Tab {
  const t = one(p.get('tab'));
  return (TABS as readonly string[]).includes(t) ? (t as Tab) : 'equipos';
}

export function parseFilter(p: URLSearchParams): TeamFilter {
  const f: TeamFilter = {};
  const q = one(p.get('q')).slice(0, 80);
  if (q) f.q = q;
  const pais = one(p.get('pais')).toLowerCase();
  if (/^[a-z]{2}$/.test(pais)) f.pais = pais;
  const area = one(p.get('area')).toLowerCase();
  if (/^[a-z0-9_-]{1,40}$/.test(area)) f.area = area;
  const mod = one(p.get('modalidad'));
  if ((MODALIDADES as string[]).includes(mod)) f.modalidad = mod as Modalidad;
  const rec = one(p.get('reclutando'));
  if ((RECLUTANDO as string[]).includes(rec)) f.reclutando = rec as Reclutando;
  const page = Number.parseInt(one(p.get('page')), 10);
  f.page = Number.isFinite(page) && page >= 1 && page <= 1000 ? page : 1;
  return f;
}

/** Solo https:, devuelve la URL normalizada o null. */
export function safeHttps(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    return u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

export function qs(base: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) if (v !== undefined && v !== '' && v !== null) sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const oneOf = <T extends string>(v: string, list: readonly T[]): T | null => ((list as readonly string[]).includes(v) ? (v as T) : null);

export interface Parsed<T> { value: T; errors: string[] }

export function parseTeamForm(fd: FormData): Parsed<NewTeam> {
  const errors: string[] = [];
  const nombre = str(fd, 'nombre').slice(0, 80);
  if (nombre.length < 2) errors.push('Ponle un nombre a tu equipo (mínimo 2 letras).');
  const resumen = str(fd, 'resumen').slice(0, 200);
  const readme = String(fd.get('readme') ?? '');
  if (readme.length > README_MAX) errors.push(`El README supera los ${README_MAX} caracteres.`);
  const enlaceRaw = str(fd, 'enlace');
  const enlace = safeHttps(enlaceRaw);
  if (enlaceRaw && !enlace) errors.push('El enlace debe empezar con https://');
  const pais = str(fd, 'pais').toLowerCase();
  const area = str(fd, 'area').toLowerCase();
  return {
    errors,
    value: {
      nombre,
      tipo: oneOf(str(fd, 'tipo'), TIPOS) ?? 'equipo',
      pais: /^[a-z]{2}$/.test(pais) ? pais : null,
      area: /^[a-z0-9_-]{1,40}$/.test(area) ? area : null,
      modalidad: oneOf(str(fd, 'modalidad'), MODALIDADES),
      nivel: oneOf(str(fd, 'nivel'), NIVELES),
      reclutando: oneOf(str(fd, 'reclutando'), RECLUTANDO) ?? 'por_confirmar',
      ciclo_anual: str(fd, 'ciclo_anual').slice(0, 80) || null,
      proxima_apertura: str(fd, 'proxima_apertura').slice(0, 80) || null,
      abierto_a_externos: oneOf(str(fd, 'abierto_a_externos'), RECLUTANDO) ?? 'por_confirmar',
      resumen,
      readme: readme.slice(0, README_MAX),
      enlace,
    },
  };
}

export function parseProfileForm(fd: FormData) {
  const errors: string[] = [];
  const nombre = str(fd, 'nombre').slice(0, 80);
  if (nombre.length < 2) errors.push('Tu nombre necesita al menos 2 letras.');
  const readme = String(fd.get('readme') ?? '');
  if (readme.length > README_MAX) errors.push(`El README supera los ${README_MAX} caracteres.`);
  const enlaceRaw = str(fd, 'enlace');
  const enlace = safeHttps(enlaceRaw);
  if (enlaceRaw && !enlace) errors.push('El enlace debe empezar con https://');
  const pais = str(fd, 'pais').toLowerCase();
  const habilidades = str(fd, 'habilidades').split(',').map((s) => s.trim().slice(0, 30)).filter(Boolean).slice(0, 15);
  return {
    errors,
    value: {
      nombre,
      carrera: str(fd, 'carrera').slice(0, 80) || null,
      pais: /^[a-z]{2}$/.test(pais) ? pais : null,
      nivel: oneOf(str(fd, 'nivel'), NIVELES),
      habilidades,
      readme: readme.slice(0, README_MAX),
      enlace,
    },
  };
}

/** Ejecuta una consulta; si D1 falla o no existe, devuelve el valor de respaldo (nunca 500). */
export async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}
