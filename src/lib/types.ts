// Contrato de datos compartido por todos los módulos. Nombres de campos en español
// porque coinciden con las columnas de D1 (migrations/0001_init.sql).

export type Estado = 'active' | 'hidden';
export type Reclutando = 'si' | 'no' | 'por_confirmar';
export type Modalidad = 'presencial' | 'remoto' | 'hibrido';
export type TeamTipo = 'equipo' | 'capitulo' | 'laboratorio' | 'competencia';
export type Origen = 'usuario' | 'curado';
export type Nivel = 'pregrado' | 'posgrado' | 'colegio' | 'profesional' | 'todos';

export interface User {
  id: string;
  proveedor: 'google' | 'github';
  id_proveedor: string;
  email: string | null; // solo para identificar al admin; nunca se muestra
  nombre: string;
  handle: string; // slug único: /u/[handle]
  carrera: string | null;
  pais: string | null; // código ISO-3166 alpha-2 en minúscula, ej. 'pe'
  nivel: Nivel | null;
  habilidades: string[]; // se guarda como JSON en D1
  readme: string; // Markdown crudo; se renderiza con renderReadme()
  enlace: string | null; // https:// únicamente
  estado: Estado;
  creado: string; // ISO 8601
}

export interface Team {
  id: string;
  slug: string;
  nombre: string;
  tipo: TeamTipo;
  pais: string | null; // ISO alpha-2 minúscula, o 'xx' para mundial
  area: string | null; // carrera/área, ej. 'electronica', 'aeroespacial'
  modalidad: Modalidad | null;
  nivel: Nivel | null;
  reclutando: Reclutando;
  ciclo_anual: string | null; // texto breve, ej. 'abre cada agosto'
  proxima_apertura: string | null; // texto o fecha ISO
  abierto_a_externos: Reclutando; // si/no/por_confirmar
  resumen: string; // una frase, máx. 200 caracteres, texto plano
  readme: string;
  enlace: string | null;
  owner_id: string | null; // null en fichas curadas sin reclamar
  origen: Origen;
  verificado_en: string | null; // fecha ISO; visible en fichas curadas
  estado: Estado;
  creado: string;
}

export interface Project {
  id: string;
  slug: string;
  nombre: string;
  team_id: string | null;
  owner_id: string | null;
  resumen: string;
  perfiles_buscados: string[]; // JSON en D1
  area: string | null;
  pais: string | null;
  readme: string;
  enlace: string | null;
  estado: Estado;
  creado: string;
}

export interface Session {
  id: string; // SHA-256 hex del token de la cookie
  user_id: string;
  expira: string;
}

export interface Report {
  id: string;
  kind: 'team' | 'project' | 'user';
  target_id: string;
  motivo: string;
  reporter_id: string;
  creado: string;
  resuelto: 0 | 1;
}

export interface TeamFilter {
  q?: string;
  pais?: string;
  area?: string;
  modalidad?: Modalidad;
  reclutando?: Reclutando;
  page?: number; // 1-based
}

export type ProjectFilter = Pick<TeamFilter, 'q' | 'pais' | 'area' | 'page'>;
export type UserFilter = Pick<TeamFilter, 'q' | 'pais' | 'page'> & { carrera?: string; habilidad?: string };

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: 20;
}

export type NewTeam = Pick<Team, 'nombre' | 'tipo' | 'pais' | 'area' | 'modalidad' | 'nivel' | 'reclutando' | 'ciclo_anual' | 'proxima_apertura' | 'abierto_a_externos' | 'resumen' | 'readme' | 'enlace'>;
export type NewProject = Pick<Project, 'nombre' | 'team_id' | 'resumen' | 'perfiles_buscados' | 'area' | 'pais' | 'readme' | 'enlace'>;

export class Forbidden extends Error {
  constructor(msg = 'forbidden') {
    super(msg);
    this.name = 'Forbidden';
  }
}
export class ReadmeTooLong extends Error {
  constructor() {
    super('readme_too_long');
    this.name = 'ReadmeTooLong';
  }
}
