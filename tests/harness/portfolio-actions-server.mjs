// Local test server only: bundle the real components without adding a Next route.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, sep } from 'node:path';
const require = createRequire(import.meta.url);
const { webpack } = require('next/dist/compiled/webpack/webpack');
const root = process.cwd(), output = mkdtempSync(join(tmpdir(), 'portfolio-actions-'));
const compiler = webpack({ mode: 'development', devtool: false, entry: resolve('tests/harness/portfolio-actions.tsx'), output: { path: output, filename: 'app.js' }, resolve: { extensions: ['.tsx', '.ts', '.js'] }, module: { rules: [{ test: /\.tsx?$/, use: resolve('tests/harness/tsx-loader.mjs'), exclude: /node_modules/ }] } });
await new Promise((done, fail) => compiler.run((error, stats) => compiler.close(() => error || stats?.hasErrors() ? fail(error || Error(stats.toString())) : done())));
const staticRoot = resolve(root, '.next/static');
const css = readdirSync(staticRoot, { recursive: true }).filter(path => String(path).endsWith('.css')).map(path => `<link rel="stylesheet" href="/_next/static/${path}">`).join('');
const server = createServer((request, response) => {
  const path = new URL(request.url, 'http://127.0.0.1').pathname;
  response.setHeader('Cache-Control', 'no-store');
  if (path === '/') { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(`<!doctype html><html lang="th"><meta name="viewport" content="width=device-width,initial-scale=1">${css}<body><div id="root"></div><script src="/app.js"></script></body></html>`); return; }
  const file = path === '/app.js' ? join(output, 'app.js') : path.startsWith('/_next/static/') ? resolve(staticRoot, path.slice('/_next/static/'.length)) : null;
  if (!file || (file !== join(output, 'app.js') && !file.startsWith(staticRoot + sep))) { response.writeHead(404).end(); return; }
  try { response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'font/woff2'); response.end(readFileSync(file)); }
  catch { response.writeHead(404).end(); }
});
server.listen(3011, '127.0.0.1');
const stop = () => { server.close(); rmSync(output, { recursive: true, force: true }); process.exit(0); };
process.once('SIGTERM', stop); process.once('SIGINT', stop);
