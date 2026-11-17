// @vitest-environment node
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { handleApi } from './handler.ts';

let server: Server;
let base: string;
let dir: string;

beforeAll(async () => {
  delete process.env.DATABASE_URL;
  dir = await mkdtemp(join(tmpdir(), 'logitrack-'));
  process.env.STATE_FILE = join(dir, 'entities.json');
  server = createServer((req, res) => void handleApi(req, res));
  await new Promise<void>((r) => server.listen(0, r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((r) => server.close(r));
  await rm(dir, { recursive: true, force: true });
});

beforeEach(async () => {
  await fetch(`${base}/api/reset`, { method: 'DELETE' });
});

type Json = Record<string, any>;
const call = async (method: string, path: string, body?: unknown) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as Json };
};

describe('bootstrap', () => {
  it('пусто: все 6 коллекций, seeded=false', async () => {
    const { status, json } = await call('GET', '/api/bootstrap');
    expect(status).toBe(200);
    expect(json.seeded).toBe(false);
    expect(Object.keys(json.data).sort()).toEqual([
      'brokerThreads',
      'chats',
      'inbox',
      'reminders',
      'runs',
      'settings',
    ]);
    for (const list of Object.values(json.data)) expect(list).toEqual([]);
  });

  it('сортирует по ord, затем id', async () => {
    await call('POST', '/api/batch', {
      ops: [
        { collection: 'runs', id: 'b', ord: 1, data: { n: 1 } },
        { collection: 'runs', id: 'a', ord: 1, data: { n: 2 } },
        { collection: 'runs', id: 'z', ord: 0, data: { n: 3 } },
      ],
      markSeeded: true,
    });
    const { json } = await call('GET', '/api/bootstrap');
    expect(json.seeded).toBe(true);
    expect(json.data.runs.map((e: { id: string }) => e.id)).toEqual([
      'z',
      'a',
      'b',
    ]);
  });
});

describe('batch', () => {
  it('upsert, delete, ord не меняется без ord', async () => {
    const r = await call('POST', '/api/batch', {
      ops: [{ collection: 'inbox', id: 'x', ord: 5, data: { v: 1 } }],
    });
    expect(r.json).toEqual({ ok: true, applied: 1 });
    await call('POST', '/api/batch', {
      ops: [{ collection: 'inbox', id: 'x', data: { v: 2 } }],
    });
    expect((await call('GET', '/api/inbox/x')).json).toEqual({
      id: 'x',
      ord: 5,
      data: { v: 2 },
    });
    await call('POST', '/api/batch', {
      ops: [{ collection: 'inbox', id: 'x', ord: 9, data: { v: 3 } }],
    });
    expect((await call('GET', '/api/inbox/x')).json.ord).toBe(9);
    await call('POST', '/api/batch', {
      ops: [{ collection: 'inbox', id: 'new', data: {} }],
    });
    expect((await call('GET', '/api/inbox/new')).json.ord).toBe(0);
    const del = await call('POST', '/api/batch', {
      ops: [{ collection: 'inbox', id: 'x', data: null }],
    });
    expect(del.json.applied).toBe(1);
    expect((await call('GET', '/api/inbox/x')).status).toBe(404);
  });

  it('валидация: коллекция, лимит операций, формат', async () => {
    const bad = (ops: unknown) => call('POST', '/api/batch', { ops });
    expect(
      (await bad([{ collection: 'nope', id: 'a', data: {} }])).status,
    ).toBe(400);
    expect((await bad([{ collection: 'runs', id: 'a', data: 5 }])).status).toBe(
      400,
    );
    expect((await call('POST', '/api/batch', {})).status).toBe(400);
    const many = Array.from({ length: 2001 }, (_, i) => ({
      collection: 'runs',
      id: `r${i}`,
      data: {},
    }));
    expect((await bad(many)).status).toBe(400);
    expect((await call('GET', '/api/batch')).status).toBe(405);
  });

  it('невалидная операция не применяет остальные', async () => {
    await call('POST', '/api/batch', {
      ops: [
        { collection: 'runs', id: 'ok', data: {} },
        { collection: 'bad', id: 'x', data: {} },
      ],
    });
    expect((await call('GET', '/api/runs')).json).toEqual([]);
  });
});

describe('CRUD', () => {
  it('PUT / GET / list / DELETE', async () => {
    const put = await call('PUT', '/api/chats/c1', {
      data: { title: 'hi' },
      ord: 2,
    });
    expect(put.status).toBe(200);
    expect((await call('GET', '/api/chats/c1')).json).toEqual({
      id: 'c1',
      ord: 2,
      data: { title: 'hi' },
    });
    await call('PUT', '/api/chats/c1', { data: { title: 'yo' } });
    expect((await call('GET', '/api/chats')).json).toEqual([
      { id: 'c1', ord: 2, data: { title: 'yo' } },
    ]);
    expect((await call('DELETE', '/api/chats/c1')).json).toEqual({ ok: true });
    expect((await call('GET', '/api/chats/c1')).status).toBe(404);
    expect((await call('PUT', '/api/chats/c1', { nope: 1 })).status).toBe(400);
    expect((await call('POST', '/api/chats/c1')).status).toBe(405);
  });
});

describe('reset и ошибки', () => {
  it('reset очищает данные и seeded', async () => {
    await call('POST', '/api/batch', {
      ops: [{ collection: 'settings', id: 's', data: { a: 1 } }],
      markSeeded: true,
    });
    expect((await call('DELETE', '/api/reset')).json).toEqual({ ok: true });
    const { json } = await call('GET', '/api/bootstrap');
    expect(json.seeded).toBe(false);
    expect(json.data.settings).toEqual([]);
  });

  it('неизвестная коллекция -> 400, не-API путь -> 404', async () => {
    expect((await call('GET', '/api/unknown')).status).toBe(400);
    expect((await call('GET', '/api/unknown/1')).status).toBe(400);
    expect((await call('GET', '/api/state')).status).toBe(400);
    expect((await call('GET', '/other')).status).toBe(404);
  });
});
