import type { LoadDocument } from '../operations/model';
const cache = new Map<string, Blob>();
export async function validateDocument(file: File) {
  if (file.size === 0 || file.size > 10 * 1024 * 1024)
    return 'Файл має містити дані та бути не більшим за 10 МБ.';
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const pdf =
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46;
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
    (byte, index) => bytes[index] === byte,
  );
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return pdf || png || jpeg ? '' : 'Дозволено лише справжні PDF, PNG або JPEG.';
}
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('logitrack-documents', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function saveDocument(
  id: string,
  file: File,
): Promise<'server' | 'local'> {
  const error = await validateDocument(file);
  if (error) throw new Error(error);
  const response = await fetch(`/api/documents/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  }).catch(() => null);
  if (
    response?.ok &&
    response.headers.get('content-type')?.includes('application/json')
  ) {
    const result = (await response.json()) as { id?: string };
    if (result.id === id) return 'server';
    throw new Error('Сервер не підтвердив збереження документа.');
  }
  if (response && !response.ok && ![404, 405].includes(response.status))
    throw new Error('Сервер не зберіг файл. Повторіть завантаження.');
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      tx.objectStore('files').put(file, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    cache.set(id, file);
    return 'local';
  } finally {
    db.close();
  }
}
export async function documentUrl(document: LoadDocument) {
  if (document.url) return document.url;
  if (document.storage === 'server')
    return `/api/documents/${encodeURIComponent(document.id)}`;
  if (cache.has(document.id))
    return URL.createObjectURL(cache.get(document.id)!);
  const db = await openDb();
  try {
    const blob = await new Promise<Blob | undefined>((resolve, reject) => {
      const request = db
        .transaction('files')
        .objectStore('files')
        .get(document.id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return blob ? URL.createObjectURL(blob) : null;
  } finally {
    db.close();
  }
}
