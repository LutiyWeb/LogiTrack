// Хранилище одного снимка состояния CRM. Тестовый бэкенд: один документ на ключ.
// С DATABASE_URL пишет в Postgres (Supabase), без него — в локальный файл.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import pg from 'pg';

const KEY = 'default';
const FILE = process.env.STATE_FILE ?? 'server/.data/state.json';

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  pool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    ssl: { rejectUnauthorized: false },
  });
  return pool;
}

async function ensureTable(db: pg.Pool) {
  await db.query(
    `create table if not exists app_state (
       key text primary key,
       data jsonb not null,
       updated_at timestamptz not null default now()
     )`,
  );
}

export async function readState(): Promise<unknown | null> {
  if (process.env.DATABASE_URL) {
    const db = getPool();
    await ensureTable(db);
    const res = await db.query('select data from app_state where key = $1', [KEY]);
    return res.rows[0]?.data ?? null;
  }
  try {
    return JSON.parse(await readFile(FILE, 'utf8'));
  } catch {
    return null;
  }
}

export async function writeState(state: unknown): Promise<void> {
  if (process.env.DATABASE_URL) {
    const db = getPool();
    await ensureTable(db);
    await db.query(
      `insert into app_state (key, data) values ($1, $2)
       on conflict (key) do update set data = excluded.data, updated_at = now()`,
      [KEY, JSON.stringify(state)],
    );
    return;
  }
  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(state));
}

export async function deleteState(): Promise<void> {
  if (process.env.DATABASE_URL) {
    const db = getPool();
    await ensureTable(db);
    await db.query('delete from app_state where key = $1', [KEY]);
    return;
  }
  await writeFile(FILE, 'null').catch(() => undefined);
}
