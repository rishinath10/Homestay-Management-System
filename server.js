// Production server for Hostinger Node.js hosting.
//
// Serves the built single-page app from dist/. Every route that is not a real
// file falls back to index.html, because routing happens client-side — without
// that fallback, opening or refreshing any URL other than "/" returns a 404.

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, 'dist');
const port = process.env.PORT || 3000;

if (!fs.existsSync(path.join(distPath, 'index.html'))) {
  console.error(
    '\n[server] dist/index.html not found.\n' +
    '[server] Run "npm run build" before starting the server.\n'
  );
  process.exit(1);
}

const app = express();

app.disable('x-powered-by');

// Hashed assets are safe to cache hard; index.html must not be, or browsers
// keep serving an old build that points at asset hashes which no longer exist.
app.use(
  express.static(distPath, {
    index: false,
    setHeaders(res, filePath) {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

// The service worker must never be cached, or clients get stuck on an old one.
app.get('/sw.js', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(distPath, 'sw.js'));
});

// SPA fallback.
app.use((req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`[server] PD Holiday Villas listening on port ${port}`);
});
