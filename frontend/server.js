const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const BACKEND_PORT = process.env.BACKEND_PORT || 4000;
const FRONTEND_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  const start = Date.now();
  const host = req.headers.host || `localhost:${PORT}`;
  const reqUrl = new URL(req.url, `http://${host}`);
  const pathname = reqUrl.pathname;

  // Log on response completion
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[Frontend :${PORT}] ${req.method} ${pathname} -> ${res.statusCode} (${duration}ms)`);
  });

  // Proxy /api/* requests to backend on port 4000
  if (pathname.startsWith('/api/')) {
    const options = {
      hostname: 'localhost',
      port: BACKEND_PORT,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `localhost:${BACKEND_PORT}`
      }
    };

    const proxyReq = http.request(options, proxyRes => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', err => {
      console.error(`Proxy error to backend on port ${BACKEND_PORT}:`, err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Bad Gateway: Backend server unavailable on port ' + BACKEND_PORT,
        details: err.message
      }));
    });

    req.pipe(proxyReq);
    return;
  }

  // Static File Serving
  let relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  let filePath = path.resolve(FRONTEND_DIR, relativePath);

  // Directory traversal security check
  if (!filePath.startsWith(FRONTEND_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  // If path is directory, look for index.html inside
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // If file doesn't exist, check for .html extension
  if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
    filePath = filePath + '.html';
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      // Fallback to index.html for unknown routes or 404
      const notFoundPath = path.join(FRONTEND_DIR, 'index.html');
      if (fs.existsSync(notFoundPath)) {
        return fs.createReadStream(notFoundPath).pipe(res);
      }
      res.end('<h1>404 Not Found</h1>');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log('=========================================');
  console.log('  Ferð Frontend Server (Port 3000)');
  console.log(`  Local URL:    http://localhost:${PORT}`);
  console.log(`  Backend Proxy: http://localhost:${BACKEND_PORT}/api`);
  console.log('=========================================');
});

module.exports = server;
