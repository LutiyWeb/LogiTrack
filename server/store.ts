// Хранилище сущностей CRM. Тестовый бэкенд: таблица entities (collection, id).
// С DATABASE_URL пишет в Postgres (Supabase), без него — в локальный JSON-файл.
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import pg from 'pg';

export const COLLECTIONS = [
  'runs',
  'inbox',
  'chats',
  'reminders',
  'brokerThreads',
  'settings',
] as const;
export type Collection = (typeof COLLECTIONS)[number];

export type Entity = { id: string; ord: number; data: unknown };
export type BatchOp = {
  collection: Collection;
  id: string;
  ord?: number;
  data: object | null;
};
export type Bootstrap = { seeded: boolean; data: Record<Collection, Entity[]> };

const META = '_meta';
const SEEDED_ID = 'seeded';

export function isCollection(value: string): value is Collection {
  return (COLLECTIONS as readonly string[]).includes(value);
}

function sortEntities(list: Entity[]): Entity[] {
  return list.sort(
    (a, b) => a.ord - b.ord || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

function emptyData(): Record<Collection, Entity[]> {
  return {
    runs: [],
    inbox: [],
    chats: [],
    reminders: [],
    brokerThreads: [],
    settings: [],
  };
}

// ---------- Postgres ----------

let pool: pg.Pool | null = null;
let tableReady: Promise<void> | null = null;

function getPool(): pg.Pool {
  pool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    ssl: { rejectUnauthorized: false },
  });
  return pool;
}

function ensureTable(db: pg.Pool): Promise<void> {
  tableReady ??= db
    .query(
      `create table if not exists entities (
         collection text not null,
         id text not null,
         ord double precision not null default 0,
         data jsonb not null,
         updated_at timestamptz default now(),
         primary key (collection, id)
       )`,
    )
    .then(() => undefined)
    .catch((error: unknown) => {
      tableReady = null;
      throw error;
    });
  return tableReady;
}

async function pgDb(): Promise<pg.Pool> {
  const db = getPool();
  await ensureTable(db);
  return db;
}

type Row = { id: string; ord: number; data: unknown };

const pgStore = {
  async bootstrap(): Promise<Bootstrap> {
    const db = await pgDb();
    const res = await db.query<Row & { collection: string }>(
      'select collection, id, ord, data from entities order by ord, id',
    );
    const data = emptyData();
    for (const row of res.rows) {
      if (isCollection(row.collection)) {
        data[row.collection].push({ id: row.id, ord: row.ord, data: row.data });
      }
    }
    const seeded = await db.query(
      'select 1 from entities where collection = $1 and id = $2',
      [META, SEEDED_ID],
    );
    return { seeded: (seeded.rowCount ?? 0) > 0, data };
  },
  async list(collection: Collection): Promise<Entity[]> {
    const db = await pgDb();
    const res = await db.query<Row>(
      'select id, ord, data from entities where collection = $1 order by ord, id',
      [collection],
    );
    return res.rows.map((r) => ({ id: r.id, ord: r.ord, data: r.data }));
  },
  async get(collection: Collection, id: string): Promise<Entity | null> {
    const db = await pgDb();
    const res = await db.query<Row>(
      'select id, ord, data from entities where collection = $1 and id = $2',
      [collection, id],
    );
    const r = res.rows[0];
    return r ? { id: r.id, ord: r.ord, data: r.data } : null;
  },
  async batch(ops: BatchOp[], markSeeded: boolean): Promise<number> {
    const db = await pgDb();
    const client = await db.connect();
    try {
      await client.query('begin');
      for (const op of ops) {
        if (op.data === null) {
          await client.query(
            'delete from entities where collection = $1 and id = $2',
            [op.collection, op.id],
          );
        } else {
          await client.query(
            `insert into entities (collection, id, ord, data) values ($1, $2, coalesce($3::double precision, 0), $4)
             on conflict (collection, id) do update
             set data = excluded.data,
                 ord = coalesce($3::double precision, entities.ord),
                 updated_at = now()`,
            [op.collection, op.id, op.ord ?? null, JSON.stringify(op.data)],
          );
        }
      }
      if (markSeeded) {
        await client.query(
          `insert into entities (collection, id, ord, data) values ($1, $2, 0, 'true')
           on conflict (collection, id) do nothing`,
          [META, SEEDED_ID],
        );
      }
      await client.query('commit');
    } catch (error) {
      await client.query('rollback').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
    return ops.length;
  },
  async reset(): Promise<void> {
    const db = await pgDb();
    await db.query('delete from entities');
  },
};

// ---------- Файл (без DATABASE_URL) ----------

type FileDb = {
  seeded: boolean;
  records: Record<string, Record<string, { ord: number; data: unknown }>>;
};

function filePath(): string {
  return process.env.STATE_FILE ?? 'server/.data/entities.json';
}

let queue: Promise<unknown> = Promise.resolve();
/** Последовательное выполнение операций над файлом. */
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function readFileDb(): Promise<FileDb> {
  try {
    const parsed = JSON.parse(
      await readFile(filePath(), 'utf8'),
    ) as Partial<FileDb> | null;
    return { seeded: parsed?.seeded === true, records: parsed?.records ?? {} };
  } catch {
    return { seeded: false, records: {} };
  }
}

async function writeFileDb(db: FileDb): Promise<void> {
  const path = filePath();
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  await writeFile(tmp, JSON.stringify(db));
  await rename(tmp, path);
}

function fileList(db: FileDb, collection: Collection): Entity[] {
  const bucket = db.records[collection] ?? {};
  return sortEntities(
    Object.entries(bucket).map(([id, r]) => ({ id, ord: r.ord, data: r.data })),
  );
}

const fileStore: typeof pgStore = {
  bootstrap: () =>
    serial(async () => {
      const db = await readFileDb();
      const data = emptyData();
      for (const c of COLLECTIONS) data[c] = fileList(db, c);
      return { seeded: db.seeded, data };
    }),
  list: (collection) =>
    serial(async () => fileList(await readFileDb(), collection)),
  get: (collection, id) =>
    serial(async () => {
      const r = (await readFileDb()).records[collection]?.[id];
      return r ? { id, ord: r.ord, data: r.data } : null;
    }),
  batch: (ops, markSeeded) =>
    serial(async () => {
      const db = await readFileDb();
      for (const op of ops) {
        const bucket = (db.records[op.collection] ??= {});
        if (op.data === null) {
          delete bucket[op.id];
        } else {
          bucket[op.id] = {
            ord: op.ord ?? bucket[op.id]?.ord ?? 0,
            data: op.data,
          };
        }
      }
      if (markSeeded) db.seeded = true;
      await writeFileDb(db);
      return ops.length;
    }),
  reset: () => serial(() => writeFileDb({ seeded: false, records: {} })),
};

export function getStore(): typeof pgStore {
  return process.env.DATABASE_URL ? pgStore : fileStore;
}
