// Carga idempotente del catálogo curado: upsert por slug.
// Uso: node scripts/seed.mjs --local | --remote [--print]
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const target = args.includes('--remote') ? '--remote' : args.includes('--local') ? '--local' : null;
if (!target && !args.includes('--print')) {
  console.error('Uso: node scripts/seed.mjs --local | --remote   (--print solo imprime el SQL)');
  process.exit(1);
}

const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const catalog = JSON.parse(readFileSync(join(root, 'seed/catalog.json'), 'utf8'));

const COLS = ['nombre', 'tipo', 'pais', 'area', 'modalidad', 'nivel', 'reclutando', 'ciclo_anual', 'proxima_apertura',
  'abierto_a_externos', 'resumen', 'readme', 'enlace', 'verificado_en'];

const stmts = catalog.map((t) => {
  if (t.enlace && !/^https:\/\//.test(t.enlace)) throw new Error(`enlace no https: ${t.slug}`);
  if (t.resumen.length > 200) throw new Error(`resumen > 200: ${t.slug}`);
  const all = ['id', 'slug', ...COLS, 'owner_id', 'origen', 'estado', 'creado'];
  const vals = [`curado-${t.slug}`, t.slug, ...COLS.map((c) => t[c]), null, 'curado', 'active', t.verificado_en];
  // El upsert no pisa estado (una ficha oculta por moderación sigue oculta), owner_id ni fichas reclamadas.
  const set = COLS.map((c) => `${c} = excluded.${c}`).join(', ');
  return `INSERT INTO teams (${all.join(', ')}) VALUES (${vals.map(q).join(', ')})\n` +
    `ON CONFLICT(slug) DO UPDATE SET ${set} WHERE teams.origen = 'curado' AND teams.owner_id IS NULL;`;
});
const sql = stmts.join('\n') + '\n';

if (args.includes('--print')) {
  process.stdout.write(sql);
  process.exit(0);
}

const dir = mkdtempSync(join(tmpdir(), 'path-seed-'));
const file = join(dir, 'seed.sql');
writeFileSync(file, sql);
const r = spawnSync('npx', ['wrangler', 'd1', 'execute', 'path-db', target, '--file', file], { stdio: 'inherit', cwd: root });
rmSync(dir, { recursive: true, force: true });
process.exit(r.status ?? 1);
