const http = require('http');
const { exec } = require('child_process');
const url = require('url');

const PORT = 4039;

// Project definitions
const PROJECTS = [
  {
    id: 'openpeople-landing',
    label: 'OpenPeople Landing',
    emoji: '🌍',
    url: 'http://vps-ovh.tail404904.ts.net:4043/',
    color: '#14b8a6',
    pm2: 'openpeople-landing',
  },
  {
    id: 'openpeople-game',
    label: 'OpenPeople Game',
    emoji: '🎮',
    url: 'http://vps-ovh.tail404904.ts.net:4044/',
    color: '#8b5cf6',
    pm2: 'openpeople-game',
  },
  {
    id: 'openpeople-api',
    label: 'OpenPeople API',
    emoji: '⚙️',
    url: 'http://vps-ovh.tail404904.ts.net:4044/api/',
    color: '#f97316',
    pm2: 'openpeople-api',
  },
  {
    id: 'openator-web',
    label: 'Openator Web',
    emoji: '💞',
    url: 'http://vps-ovh.tail404904.ts.net:3031/',
    color: '#ec4899',
    pm2: 'openator-web',
    ecosystem: 'openator',
  },
  {
    id: 'openator-api',
    label: 'Openator API',
    emoji: '⚙️',
    url: 'http://vps-ovh.tail404904.ts.net:3030/',
    color: '#f97316',
    pm2: 'openator-api',
    ecosystem: 'openator',
  },
  {
    id: 'taskbee-frontend',
    label: 'TaskBee App',
    emoji: '🐝',
    url: 'http://vps-ovh.tail404904.ts.net:4047/',
    color: '#f59e0b',
    pm2: 'taskbee-frontend',
    ecosystem: 'taskbee',
  },
  {
    id: 'taskbee-api',
    label: 'TaskBee API',
    emoji: '⚙️',
    url: 'http://vps-ovh.tail404904.ts.net:4047/api/',
    color: '#d97706',
    pm2: 'taskbee-api',
    ecosystem: 'taskbee',
  },
  {
    id: 'taskbee-admin',
    label: 'TaskBee Admin',
    emoji: '🛡️',
    url: 'http://vps-ovh.tail404904.ts.net:4048/',
    color: '#b45309',
    pm2: 'taskbee-admin',
    ecosystem: 'taskbee',
  },
];

const ECOSYSTEMS = {
  openpeople: '/home/shad/projects/openpeople/ecosystem.config.js',
  openator: '/home/shad/projects/openator/ecosystem.config.js',
  taskbee: '/home/shad/projects/taskbee/ecosystem.config.js',
};

function pm2Cmd(action, name, ecosystemKey) {
  return new Promise((resolve, reject) => {
    const ecosystem = ECOSYSTEMS[ecosystemKey] || ECOSYSTEMS.openpeople;
    const cmd = action === 'start'
      ? `pm2 start ${ecosystem} --only ${name} --silent 2>&1`
      : `pm2 ${action} ${name} --silent 2>&1`;
    exec(cmd, (err, stdout) => {
      if (err) reject(stdout || err.message);
      else resolve(stdout.trim());
    });
  });
}

function pm2List() {
  return new Promise((resolve) => {
    exec('pm2 jlist 2>/dev/null', (err, stdout) => {
      try {
        resolve(JSON.parse(stdout || '[]'));
      } catch {
        resolve([]);
      }
    });
  });
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, code, data) {
  cors(res);
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function html(res, content) {
  cors(res);
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(content);
}

const PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🛠️ Local Dev Hub</title>
  <style>
    :root {
      --bg: #0f172a; --surface: #1e293b; --border: #334155;
      --text: #f1f5f9; --muted: #94a3b8;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; padding: 2rem; }
    h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.25rem; }
    .subtitle { color: var(--muted); font-size: 0.875rem; margin-bottom: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; transition: border-color 0.2s; }
    .card:hover { border-color: var(--accent); }
    .card-header { display: flex; align-items: center; gap: 0.75rem; }
    .emoji { font-size: 1.5rem; }
    .card-title { font-weight: 600; font-size: 1rem; }
    .status-row { display: flex; align-items: center; gap: 0.5rem; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); flex-shrink: 0; }
    .dot.online { background: #22c55e; box-shadow: 0 0 6px #22c55e88; }
    .dot.stopped { background: #ef4444; }
    .dot.loading { background: #f59e0b; animation: pulse 1s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
    .status-text { font-size: 0.8rem; color: var(--muted); }
    .actions { display: flex; gap: 0.5rem; margin-top: 0.25rem; }
    .btn { padding: 0.35rem 0.85rem; border-radius: 6px; border: 1px solid var(--border); background: transparent; color: var(--text); font-size: 0.8rem; cursor: pointer; transition: all 0.15s; }
    .btn:hover { background: #334155; }
    .btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
    .btn.danger { border-color: #ef4444; color: #ef4444; }
    .btn.danger:hover { background: #ef4444; color: #fff; }
    .btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .open-link { color: var(--muted); font-size: 0.75rem; text-decoration: none; }
    .open-link:hover { color: var(--text); }
    .toast { position: fixed; bottom: 1.5rem; right: 1.5rem; background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 0.75rem 1rem; font-size: 0.85rem; opacity: 0; transition: opacity 0.3s; pointer-events: none; }
    .toast.show { opacity: 1; }
  </style>
</head>
<body>
  <h1>🛠️ Local Dev Hub</h1>
  <p class="subtitle">Tailscale-only · VPS dev projects</p>
  <div class="grid" id="grid">Loading…</div>
  <div class="toast" id="toast"></div>

  <script>
    const API = '';
    let projects = [];

    async function fetchStatus() {
      const res = await fetch(API + '/api/status');
      return res.json();
    }

    function toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2500);
    }

    async function action(id, act) {
      const btns = document.querySelectorAll('[data-id="' + id + '"] .btn');
      btns.forEach(b => b.disabled = true);
      const dot = document.querySelector('[data-id="' + id + '"] .dot');
      if (dot) { dot.className = 'dot loading'; }
      try {
        const res = await fetch(API + '/api/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, action: act })
        });
        const data = await res.json();
        toast(data.message || 'Done');
      } catch(e) {
        toast('Error: ' + e.message);
      }
      setTimeout(render, 1500);
    }

    async function render() {
      const status = await fetchStatus();
      const grid = document.getElementById('grid');
      grid.innerHTML = status.map(p => {
        const online = p.status === 'online';
        const hasPm2 = p.pm2 !== null;
        return \`<div class="card" data-id="\${p.id}" style="--accent:\${p.color}">
          <div class="card-header">
            <span class="emoji">\${p.emoji}</span>
            <div>
              <div class="card-title">\${p.label}</div>
              <a class="open-link" href="\${p.url}" target="_blank">\${p.url}</a>
            </div>
          </div>
          <div class="status-row">
            <div class="dot \${online ? 'online' : 'stopped'}"></div>
            <span class="status-text">\${p.status}\${p.uptime ? ' · ' + p.uptime : ''}\${p.mem ? ' · ' + p.mem : ''}</span>
          </div>
          \${hasPm2 ? \`<div class="actions">
            \${online
              ? \`<button class="btn danger" onclick="action('\${p.id}','stop')">Stop</button>
                 <button class="btn" onclick="action('\${p.id}','restart')">Restart</button>\`
              : \`<button class="btn primary" onclick="action('\${p.id}','start')">Start</button>\`
            }
          </div>\` : ''}
        </div>\`;
      }).join('');
    }

    render();
    setInterval(render, 10000);
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const path = parsed.pathname;

  if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); res.end(); return; }

  if (path === '/health') { json(res, 200, { ok: true }); return; }

  if (path === '/' || path === '') { html(res, PAGE); return; }

  if (path === '/api/status') {
    const list = await pm2List();
    const byName = {};
    list.forEach(p => { byName[p.name] = p; });

    const status = PROJECTS.map(p => {
      const pm2info = p.pm2 ? byName[p.pm2] : null;
      let statusStr = 'unknown';
      let uptime = null;
      let mem = null;

      if (pm2info) {
        statusStr = pm2info.pm2_env?.status || 'unknown';
        const uptimeMs = pm2info.pm2_env?.pm_uptime ? Date.now() - pm2info.pm2_env.pm_uptime : null;
        if (uptimeMs && statusStr === 'online') {
          const mins = Math.floor(uptimeMs / 60000);
          uptime = mins < 60 ? `${mins}m` : `${Math.floor(mins/60)}h${mins%60}m`;
        }
        const memBytes = pm2info.monit?.memory;
        if (memBytes) mem = `${Math.round(memBytes / 1024 / 1024)}MB`;
      } else if (p.pm2) {
        statusStr = 'stopped'; // pm2-managed but not running yet
      } else {
        statusStr = 'external'; // not pm2-managed
      }

      return { ...p, status: statusStr, uptime, mem };
    });

    json(res, 200, status);
    return;
  }

  if (path === '/api/action' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', async () => {
      try {
        const { id, action } = JSON.parse(body);
        const project = PROJECTS.find(p => p.id === id);
        // Pass project to pm2Cmd for ecosystem lookup
        if (project) project._resolved = true;
        if (!project || !project.pm2) { json(res, 400, { error: 'not found or not pm2 managed' }); return; }
        if (!['start','stop','restart'].includes(action)) { json(res, 400, { error: 'invalid action' }); return; }
        await pm2Cmd(action, project.pm2, project.ecosystem);
        json(res, 200, { message: `${action} → ${project.label}` });
      } catch (e) {
        json(res, 500, { error: String(e) });
      }
    });
    return;
  }

  json(res, 404, { error: 'not found' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Dev Hub running on http://0.0.0.0:${PORT}`);
});
