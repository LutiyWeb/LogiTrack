import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { validateSnapshot } from './validation.ts';

export type StoredWorkspace = {
  revision: number;
  snapshot: Record<string, unknown> | null;
};
export function createWorkspaceService(directory: string) {
  let value: StoredWorkspace | undefined;
  let chain: Promise<unknown> = Promise.resolve();
  const read = async () => {
    if (value) return structuredClone(value);
    try {
      value = JSON.parse(
        await readFile(path.join(directory, 'workspace.json'), 'utf8'),
      ) as StoredWorkspace;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      value = { revision: 0, snapshot: null };
    }
    return structuredClone(value);
  };
  const update = (expected: number, snapshot: unknown) => {
    const task = chain.then(async () => {
      const current = await read();
      if (!Number.isSafeInteger(expected) || expected !== current.revision)
        return { ok: false as const, value: structuredClone(current) };
      const valid = structuredClone(validateSnapshot(snapshot));
      const next = { revision: current.revision + 1, snapshot: valid };
      await mkdir(directory, { recursive: true });
      const temp = path.join(directory, `workspace-${crypto.randomUUID()}.tmp`);
      await writeFile(temp, JSON.stringify(next), { mode: 0o600 });
      await rename(temp, path.join(directory, 'workspace.json'));
      value = next;
      return { ok: true as const, value: structuredClone(next) };
    });
    chain = task.catch(() => undefined);
    return task;
  };
  return { read, update };
}
async function body(req: IncomingMessage, max = 12 * 1024 * 1024) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > max) throw new Error('Завеликий запит.');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}
function json(res: ServerResponse, status: number, value: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(value));
}
function fileType(bytes: Buffer) {
  if (bytes.subarray(0, 4).toString() === '%PDF') return 'application/pdf';
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return 'image/png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return 'image/jpeg';
  return null;
}
/** Local review server only; no cloud database or third-party credentials are accessed. */
export function workspaceApi(): Plugin {
  return {
    name: 'logitrack-review-workspace',
    apply: 'serve',
    configureServer(server) {
      const directory = path.resolve(
        server.config.root,
        'server/.data/audit-review',
      );
      const service = createWorkspaceService(directory);
      server.middlewares.use(async (req, res, next) => {
        if (
          !req.url?.startsWith('/api/workspace') &&
          !req.url?.startsWith('/api/documents/')
        )
          return next();
        try {
          if (
            req.headers.origin &&
            req.headers.origin !== `http://${req.headers.host}` &&
            req.headers.origin !== `https://${req.headers.host}`
          )
            return json(res, 403, { error: 'Origin denied' });
          if (req.url === '/api/workspace' && req.method === 'GET')
            return json(res, 200, await service.read());
          if (req.url === '/api/workspace' && req.method === 'PUT') {
            const input = JSON.parse((await body(req)).toString()) as {
              revision: number;
              snapshot: unknown;
            };
            const result = await service.update(input.revision, input.snapshot);
            return json(res, result.ok ? 200 : 409, result.value);
          }
          const id = req.url.split('/')[3];
          if (!id || !/^[a-zA-Z0-9_-]{1,100}$/.test(id))
            return json(res, 400, { error: 'Invalid document id' });
          const file = path.join(directory, 'documents', id);
          if (req.method === 'PUT') {
            const bytes = await body(req, 10 * 1024 * 1024);
            if (!fileType(bytes))
              return json(res, 415, {
                error: 'Only PDF, PNG, JPEG files are allowed',
              });
            await mkdir(path.dirname(file), { recursive: true });
            await writeFile(file, bytes, { flag: 'wx', mode: 0o600 });
            return json(res, 201, { id });
          }
          if (req.method === 'GET') {
            const bytes = await readFile(file);
            const type = fileType(bytes);
            if (!type) return json(res, 415, { error: 'Invalid file' });
            res.setHeader('Content-Type', type);
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('Cache-Control', 'private, no-store');
            res.end(bytes);
            return;
          }
          return json(res, 405, { error: 'Method not allowed' });
        } catch (error) {
          const code = (error as NodeJS.ErrnoException).code;
          return json(
            res,
            code === 'ENOENT' ? 404 : code === 'EEXIST' ? 409 : 422,
            {
              error: error instanceof Error ? error.message : 'Invalid request',
            },
          );
        }
      });
    },
  };
}
