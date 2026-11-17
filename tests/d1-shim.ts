// Mini D1 sobre node:sqlite para pruebas sin red. Aplica migrations/*.sql.
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

class Stmt {
  constructor(private db: DatabaseSync, private sql: string, private args: unknown[] = []) {}
  bind(...args: unknown[]) { return new Stmt(this.db, this.sql, args); }
  async first<T>(): Promise<T | null> { return (this.db.prepare(this.sql).get(...(this.args as any[])) as T) ?? null; }
  async all<T>() { return { results: this.db.prepare(this.sql).all(...(this.args as any[])) as T[], success: true }; }
  async run() { const r = this.db.prepare(this.sql).run(...(this.args as any[])); return { success: true, meta: { changes: Number(r.changes) } }; }
}

export function makeDb(): D1Database {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON');
  const dir = join(process.cwd(), 'migrations');
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) raw.exec(readFileSync(join(dir, f), 'utf8'));
  return {
    prepare: (sql: string) => new Stmt(raw, sql),
    batch: async (stmts: Stmt[]) => { const out = []; for (const s of stmts) out.push(await s.run()); return out; },
  } as unknown as D1Database;
}
