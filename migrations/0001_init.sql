-- Esquema inicial de Path. Los nombres de columna coinciden con src/lib/types.ts.
-- habilidades y perfiles_buscados se guardan como JSON en TEXT.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  proveedor TEXT NOT NULL CHECK (proveedor IN ('google','github')),
  id_proveedor TEXT NOT NULL,
  email TEXT,
  nombre TEXT NOT NULL,
  handle TEXT NOT NULL UNIQUE,
  carrera TEXT,
  pais TEXT,
  nivel TEXT,
  habilidades TEXT NOT NULL DEFAULT '[]',
  readme TEXT NOT NULL DEFAULT '',
  enlace TEXT,
  estado TEXT NOT NULL DEFAULT 'active' CHECK (estado IN ('active','hidden')),
  creado TEXT NOT NULL,
  UNIQUE (proveedor, id_proveedor)
);

CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'equipo',
  pais TEXT,
  area TEXT,
  modalidad TEXT,
  nivel TEXT,
  reclutando TEXT NOT NULL DEFAULT 'por_confirmar',
  ciclo_anual TEXT,
  proxima_apertura TEXT,
  abierto_a_externos TEXT NOT NULL DEFAULT 'por_confirmar',
  resumen TEXT NOT NULL DEFAULT '',
  readme TEXT NOT NULL DEFAULT '',
  enlace TEXT,
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  origen TEXT NOT NULL DEFAULT 'usuario' CHECK (origen IN ('usuario','curado')),
  verificado_en TEXT,
  estado TEXT NOT NULL DEFAULT 'active' CHECK (estado IN ('active','hidden')),
  creado TEXT NOT NULL
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  resumen TEXT NOT NULL DEFAULT '',
  perfiles_buscados TEXT NOT NULL DEFAULT '[]',
  area TEXT,
  pais TEXT,
  readme TEXT NOT NULL DEFAULT '',
  enlace TEXT,
  estado TEXT NOT NULL DEFAULT 'active' CHECK (estado IN ('active','hidden')),
  creado TEXT NOT NULL
);

CREATE TABLE memberships (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  rol TEXT NOT NULL DEFAULT 'miembro',
  PRIMARY KEY (user_id, team_id)
);

-- id = SHA-256 hex del token que viaja en la cookie
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expira TEXT NOT NULL
);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('team','project','user')),
  target_id TEXT NOT NULL,
  motivo TEXT NOT NULL,
  reporter_id TEXT NOT NULL,
  creado TEXT NOT NULL,
  resuelto INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_teams_pais ON teams(pais);
CREATE INDEX idx_teams_estado ON teams(estado);
CREATE INDEX idx_teams_area ON teams(area);
CREATE INDEX idx_teams_owner ON teams(owner_id);
CREATE INDEX idx_projects_pais ON projects(pais);
CREATE INDEX idx_projects_estado ON projects(estado);
CREATE INDEX idx_projects_team ON projects(team_id);
CREATE INDEX idx_users_pais ON users(pais);
CREATE INDEX idx_users_estado ON users(estado);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_reports_resuelto ON reports(resuelto);
