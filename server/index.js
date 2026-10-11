const http = require('http');
const { URL } = require('url');

const PORT = 3001;

function buildCandidateFromImage() {
  return {
    type: 'electric',
    brand: 'Tesla',
    model: 'Model 3',
    year: 2022,
    version: 'Long Range',
    confidence: 82,
  };
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    req.on('data', (chunk) => {
      chunks.push(chunk);
      total += chunk.length;
    });

    req.on('end', () => {
      const buffer = Buffer.concat(chunks, total);
      const contentType = req.headers['content-type'] || '';
      const boundary = contentType.match(/boundary=(.+)$/i)?.[1];

      if (!boundary) {
        resolve({ image: null, raw: buffer });
        return;
      }

      const boundaryBuffer = Buffer.from(`--${boundary}`);
      const parts = [];
      let start = 0;

      while (start < buffer.length) {
        const idx = buffer.indexOf(boundaryBuffer, start);
        if (idx === -1) break;
        const next = buffer.indexOf(boundaryBuffer, idx + boundaryBuffer.length);
        if (next === -1) break;
        const block = buffer.subarray(idx + boundaryBuffer.length, next);
        if (block.includes(Buffer.from('Content-Disposition'))) {
          parts.push(block);
        }
        start = next;
      }

      const imagePart = parts.find((part) => part.includes(Buffer.from('filename=')));
      if (!imagePart) {
        resolve({ image: null, raw: buffer });
        return;
      }

      const headersEnd = imagePart.indexOf(Buffer.from('\r\n\r\n'));
      const content = imagePart.subarray(headersEnd + 4, imagePart.length - 4);
      resolve({ image: content, raw: buffer });
    });

    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST' || requestUrl.pathname !== '/api/analyze-vehicle') {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Route introuvable.' }));
    return;
  }

  try {
    const { image } = await parseMultipart(req);
    if (!image) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Aucune image reçue.' }));
      return;
    }

    const candidate = buildCandidateFromImage();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ candidate }));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message || 'Erreur serveur.' }));
  }
});

server.listen(PORT, () => {
  console.log(`Vehicle scan backend listening on http://localhost:${PORT}`);
});
