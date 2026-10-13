const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/styles.css': 'styles.css',
  '/app.js': 'app.js',
  '/shared/project-store.js': 'shared/project-store.js',
  '/mobile/': 'mobile/index.html',
  '/mobile/index.html': 'mobile/index.html',
  '/mobile/styles.css': 'mobile/styles.css',
  '/mobile/app.js': 'mobile/app.js',
  '/assets/living-room.png': 'assets/living-room.png',
  '/drafts/': 'drafts/home.html',
  '/drafts/home.html': 'drafts/home.html',
  '/drafts/budget.html': 'drafts/budget.html'
};
const types = {'.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png'};
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/mobile' && ['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(308, {'Location': '/mobile/'});
    res.end();
    return;
  }
  const file = files[pathname];
  if (!file || !['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(file ? 405 : 404, {'Content-Type': 'text/plain; charset=utf-8'});
    res.end(file ? 'Method not allowed' : 'Not found');
    return;
  }
  fs.stat(path.join(__dirname, file), (error, stat) => {
    if (error) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, {'Content-Type': types[path.extname(file)], 'Content-Length': stat.size, 'Cache-Control': 'no-store'});
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(path.join(__dirname, file)).on('error', () => res.destroy()).pipe(res);
  });
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? 'Port 8765 is already in use. Close the other preview server and try again.' : error.message);
  process.exitCode = 1;
});
server.listen(8765, '127.0.0.1', () => console.log('RenoGuard preview: http://127.0.0.1:8765'));
