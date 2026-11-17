import type { IncomingMessage, ServerResponse } from 'node:http';
import { deleteState, readState, writeState } from './state.ts';

const MAX_BYTES = 5 * 1024 * 1024;

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BYTES) throw new Error('too large');
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

/** GET /api/state, PUT /api/state, DELETE /api/state. Общий для dev-сервера и Vercel. */
export async function handleState(req: IncomingMessage, res: ServerResponse) {
  try {
    if (req.method === 'GET') return send(res, 200, { state: await readState() });
    if (req.method === 'PUT') {
      const body = (await readBody(req)) as { state?: unknown };
      if (!body || typeof body.state !== 'object' || body.state === null) {
        return send(res, 400, { error: 'state must be an object' });
      }
      await writeState(body.state);
      return send(res, 200, { ok: true });
    }
    if (req.method === 'DELETE') {
      await deleteState();
      return send(res, 200, { ok: true });
    }
    return send(res, 405, { error: 'method not allowed' });
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: 'server error' });
  }
}
