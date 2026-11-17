import type { IncomingMessage, ServerResponse } from 'node:http';
import { getStore, isCollection, type BatchOp } from './store.ts';

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_OPS = 2000;

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'invalid JSON');
  }
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  // На Vercel тело может быть уже разобрано.
  const pre = (req as IncomingMessage & { body?: unknown }).body;
  if (pre !== undefined && pre !== null) {
    if (typeof pre === 'object' && !Buffer.isBuffer(pre)) return pre;
    return parseJson(Buffer.isBuffer(pre) ? pre.toString('utf8') : String(pre));
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    size += buf.length;
    if (size > MAX_BYTES) throw new HttpError(400, 'body too large');
    chunks.push(buf);
  }
  return parseJson(Buffer.concat(chunks).toString('utf8'));
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function validId(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= 200;
}

function validOrd(v: unknown): v is number | undefined {
  return v === undefined || (typeof v === 'number' && Number.isFinite(v));
}

function parseBatch(body: unknown): { ops: BatchOp[]; markSeeded: boolean } {
  if (!isPlainObject(body) || !Array.isArray(body.ops)) {
    throw new HttpError(400, 'ops must be an array');
  }
  if (body.ops.length > MAX_OPS)
    throw new HttpError(400, `too many ops (max ${MAX_OPS})`);
  if (body.markSeeded !== undefined && typeof body.markSeeded !== 'boolean') {
    throw new HttpError(400, 'markSeeded must be boolean');
  }
  const ops = body.ops.map((raw: unknown): BatchOp => {
    if (!isPlainObject(raw)) throw new HttpError(400, 'op must be an object');
    const { collection, id, ord, data } = raw;
    if (typeof collection !== 'string' || !isCollection(collection)) {
      throw new HttpError(400, 'unknown collection');
    }
    if (!validId(id)) throw new HttpError(400, 'invalid id');
    if (!validOrd(ord)) throw new HttpError(400, 'ord must be a number');
    if (data !== null && !isPlainObject(data)) {
      throw new HttpError(400, 'data must be object or null');
    }
    return { collection, id, ord, data };
  });
  return { ops, markSeeded: body.markSeeded === true };
}

/** REST API: /api/bootstrap, /api/batch, /api/reset, /api/:collection[/:id]. Общий для dev-сервера и Vercel. */
export async function handleApi(req: IncomingMessage, res: ServerResponse) {
  try {
    const method = req.method ?? 'GET';
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    const match = /^\/api\/(.+?)\/?$/.exec(pathname);
    if (!match) throw new HttpError(404, 'not found');
    let parts: string[];
    try {
      parts = match[1].split('/').map(decodeURIComponent);
    } catch {
      throw new HttpError(400, 'bad path');
    }
    const store = getStore();
    const [first, id, ...rest] = parts;
    if (rest.length > 0) throw new HttpError(404, 'not found');

    if (id === undefined && first === 'bootstrap') {
      if (method !== 'GET') throw new HttpError(405, 'method not allowed');
      return send(res, 200, await store.bootstrap());
    }
    if (id === undefined && first === 'batch') {
      if (method !== 'POST') throw new HttpError(405, 'method not allowed');
      const { ops, markSeeded } = parseBatch(await readBody(req));
      return send(res, 200, {
        ok: true,
        applied: await store.batch(ops, markSeeded),
      });
    }
    if (id === undefined && first === 'reset') {
      if (method !== 'DELETE') throw new HttpError(405, 'method not allowed');
      await store.reset();
      return send(res, 200, { ok: true });
    }

    if (!isCollection(first)) throw new HttpError(400, 'unknown collection');
    if (id === undefined) {
      if (method !== 'GET') throw new HttpError(405, 'method not allowed');
      return send(res, 200, await store.list(first));
    }
    if (!validId(id)) throw new HttpError(400, 'invalid id');
    if (method === 'GET') {
      const entity = await store.get(first, id);
      if (!entity) throw new HttpError(404, 'not found');
      return send(res, 200, entity);
    }
    if (method === 'PUT') {
      const body = await readBody(req);
      if (!isPlainObject(body) || !isPlainObject(body.data)) {
        throw new HttpError(400, 'data must be an object');
      }
      if (!validOrd(body.ord)) throw new HttpError(400, 'ord must be a number');
      await store.batch(
        [{ collection: first, id, ord: body.ord, data: body.data }],
        false,
      );
      return send(res, 200, await store.get(first, id));
    }
    if (method === 'DELETE') {
      await store.batch([{ collection: first, id, data: null }], false);
      return send(res, 200, { ok: true });
    }
    throw new HttpError(405, 'method not allowed');
  } catch (error) {
    if (error instanceof HttpError)
      return send(res, error.status, { error: error.message });
    // Логируем только тип ошибки: в сообщениях БД может быть строка подключения.
    console.error(
      'API error:',
      error instanceof Error ? error.name : 'unknown',
    );
    return send(res, 500, { error: 'server error' });
  }
}
