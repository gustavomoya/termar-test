const http = require('http');
const data = require('./data');

const PORT = process.env.PORT || 4000;

// --- Helpers --------------------------------------------------------------

function sendJson(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    // Open CORS so a frontend on any dev port (Vite, CRA, etc.) can call this.
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(payload);
}

function notFound(res) {
  sendJson(res, 404, { error: 'not_found' });
}

function readBody(req, callback) {
  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
    // Guard against absurdly large bodies; photos would be base64 and big, but
    // this is a toy backend, so cap at ~10 MB and let the candidate adjust.
    if (raw.length > 10 * 1024 * 1024) req.destroy();
  });
  req.on('end', () => {
    if (!raw) return callback(null, {});
    try {
      callback(null, JSON.parse(raw));
    } catch (err) {
      callback(err);
    }
  });
}

// --- Routes ---------------------------------------------------------------

const routes = [
  // The technician and the day this seed represents.
  ['GET', '/api/day', (req, res) => sendJson(res, 200, data.getDay())],

  // The day's jobs, in scheduled order.
  ['GET', '/api/jobs', (req, res) => sendJson(res, 200, data.getJobs())],

  // One job by id.
  [
    'GET',
    '/api/jobs/:id',
    (req, res, params) => {
      const job = data.getJob(params.id);
      return job ? sendJson(res, 200, job) : notFound(res);
    },
  ],

  // The saved worksheet for a job (404 if none saved yet).
  [
    'GET',
    '/api/jobs/:id/worksheet',
    (req, res, params) => {
      const worksheet = data.getWorksheet(params.id);
      return worksheet ? sendJson(res, 200, worksheet) : notFound(res);
    },
  ],

  // Save (create or replace) a worksheet for a job. This is the main write:
  // the frontend sends the checklist, parts, photos and signature it gathered.
  [
    'PUT',
    '/api/jobs/:id/worksheet',
    (req, res, params) => {
      if (!data.getJob(params.id)) return notFound(res);
      readBody(req, (err, body) => {
        if (err) return sendJson(res, 400, { error: 'invalid_json' });
        const saved = data.saveWorksheet(params.id, body);
        sendJson(res, 200, saved);
      });
    },
  ],

  // Update a job's sync status, e.g. { "status": "synced" }. Useful for showing
  // the queued -> synced transition when the candidate flushes their queue.
  [
    'POST',
    '/api/jobs/:id/status',
    (req, res, params) => {
      readBody(req, (err, body) => {
        if (err) return sendJson(res, 400, { error: 'invalid_json' });
        const updated = data.setJobStatus(params.id, body.status);
        return updated ? sendJson(res, 200, updated) : notFound(res);
      });
    },
  ],

  // Checklist templates (all, or one by plant type: gas_boiler | chiller).
  [
    'GET',
    '/api/checklist-templates',
    (req, res) => sendJson(res, 200, data.getChecklistTemplates()),
  ],
  [
    'GET',
    '/api/checklist-templates/:plantType',
    (req, res, params) => {
      const template = data.getChecklistTemplate(params.plantType);
      return template ? sendJson(res, 200, template) : notFound(res);
    },
  ],

  // What's on the van.
  [
    'GET',
    '/api/van-stock',
    (req, res) => sendJson(res, 200, data.getVanStock()),
  ],

  // A snapshot of the outbound sync queue (read-only here).
  [
    'GET',
    '/api/sync-queue',
    (req, res) => sendJson(res, 200, data.getSyncQueue()),
  ],
];

// Match a request path against a route pattern, extracting :params.
function matchRoute(method, pathname) {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  for (const [routeMethod, pattern, handler] of routes) {
    if (routeMethod !== method) continue;
    const patternParts = pattern.split('/').filter(Boolean);
    if (patternParts.length !== parts.length) continue;
    const params = {};
    let matched = true;
    for (let i = 0; i < patternParts.length; i += 1) {
      const p = patternParts[i];
      if (p.startsWith(':')) params[p.slice(1)] = decodeURIComponent(parts[i]);
      else if (p !== parts[i]) {
        matched = false;
        break;
      }
    }
    if (matched) return { handler, params };
  }
  return null;
}

const server = http.createServer((req, res) => {
  // Answer CORS preflight requests.
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const route = matchRoute(req.method, pathname);
  if (!route) return notFound(res);
  return route.handler(req, res, route.params);
});

server.listen(PORT, () => {
  console.log(`Termar field-worksheet API running at http://localhost:${PORT}`);
  console.log('Try:   curl http://localhost:' + PORT + '/api/jobs');
});
