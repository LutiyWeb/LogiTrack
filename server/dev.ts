import { createServer } from 'node:http';
import { handleApi } from './handler.ts';

const port = Number(process.env.PORT ?? 8787);

createServer((req, res) => {
  if (req.url?.startsWith('/api/')) return void handleApi(req, res);
  res.statusCode = 404;
  res.end('not found');
}).listen(port, () => console.log(`API on http://localhost:${port}`));
