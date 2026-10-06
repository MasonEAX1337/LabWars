import { createServer } from 'node:http';
import { createServer as createVite } from 'vite';
import { handle } from './handler.js';
const vite = await createVite({ server: { middlewareMode: true }, appType: 'spa' });
const server = createServer(async (req, res) => {
  if (!req.url?.startsWith('/api/game')) return vite.middlewares(req, res);
  try {
    const chunks: Buffer[] = []; let size = 0;
    for await (const chunk of req) { size += chunk.length; if (size > 8192) { res.writeHead(413); res.end(); return; } chunks.push(chunk); }
    const origin = `http://${req.headers.host}`;
    const request = new Request(origin + req.url, { method: req.method, headers: req.headers as HeadersInit, ...(req.method === 'POST' ? { body: Buffer.concat(chunks) } : {}) });
    const response = await handle(request); res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(await response.text());
  } catch { res.writeHead(500); res.end(JSON.stringify({ error: 'Request failed.' })); }
});
server.listen(Number(process.env.PORT ?? 5173), '0.0.0.0', () => console.log('Lab Wars ready at http://localhost:5173'));
