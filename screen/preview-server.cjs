const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = {'/': 'home.html', '/home.html': 'home.html', '/budget.html': 'budget.html'};
http.createServer((req, res) => {
  const file = files[new URL(req.url, 'http://localhost').pathname];
  if (!file) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'});
  fs.createReadStream(path.join(__dirname, file)).pipe(res);
}).listen(8765, '127.0.0.1', () => console.log('Renoguard preview: http://127.0.0.1:8765'));
