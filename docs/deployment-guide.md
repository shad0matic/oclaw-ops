# OpenClaw + Postgres Agent Infrastructure — Deployment Guide
**Author:** Kevin 🍌 (with Boss)
**Started:** 10/02/2026
**Last updated:** 10/02/2026
**Status:** Phase 5 complete, Phase 6 in progress

This guide documents everything needed to reproduce our agent infrastructure from scratch.

---

## Overview

What we're building:
- **OpenClaw** — AI assistant on a VPS, accessible via Telegram
- **Multi-agent team** — specialized agents coordinated by a lead agent (Kevin)
- **Postgres + pgvector** — long-term memory with semantic search, workflow engine, task coordination
- **Gmail/Calendar** — via gog CLI + Google Pub/Sub webhooks
- **Mission Control** — mobile-friendly dashboard via Tailscale

### Architecture
```
┌─────────────────────────────────────────────────────┐
│                      VPS (22GB RAM, Debian)          │
│                                                      │
│  ┌──────────┐   ┌───────────────────────────┐       │
│  │ OpenClaw │   │  Postgres 18.1 (bare metal)│       │
│  │ Gateway  │   │  pgvector 0.8.1            │       │
│  │          │◄──┤  DB: openclaw_db           │       │
│  │ ┌──────┐ │   │  ├── memory schema         │       │
│  │ │Kevin │ │   │  └── ops schema            │       │
│  │ │(main)│ │   └───────────────────────────┘       │
│  │ └──┬───┘ │                                        │
│  │ ┌──┴─────┐   ┌───────────────────────────┐       │
│  │ │ Agents │   │  gog Gmail watch           │       │
│  │ │Nefario │   │  (Pub/Sub → OpenClaw hook) │       │
│  │ │XReader │   └───────────────────────────┘       │
│  │ └────────┘                                        │
│  └──────────┘   ┌───────────────────────────┐       │
│                  │  Mission Control (Next.js) │       │
│                  │  Tailscale-only access     │       │
│                  └───────────────────────────┘       │
└─────────────────────────────────────────────────────┘
         │              │               │
      Telegram     Tailscale        Gmail/Cal
      (chat)      (dashboard)     (Pub/Sub)
```

## Prerequisites

- **VPS:** Linux (Debian/Ubuntu), 8GB+ RAM recommended, 20GB+ disk
- **Accounts needed:**
  - Anthropic API key (Claude models)
  - OpenAI API key (embeddings + Whisper STT)
  - xAI API key (Grok-powered agents)
  - Google API key (Gemini fallback)
  - ElevenLabs API key (TTS voice)
  - Brave Search API key (web search)
  - Telegram bot token (@BotFather)
  - Gmail account for agent (OAuth via gog CLI)

---

## Phase 0 — OpenClaw Base Install ✅
*Completed 09/02/2026*

```bash
# Install Node.js 24+
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo bash -
sudo apt install -y nodejs

# Install OpenClaw
sudo npm install -g openclaw

# Run onboarding wizard
openclaw onboard
```

Key config:
- Multi-provider fallback: Opus → GPT-5.2 → Grok-3 → Gemini 2.5 Pro
- 3 agents: Kevin (main), Dr. Nefario (researcher), X Reader (content fetcher)
- Telegram bindings with topic routing

Systemd service:
```bash
openclaw gateway start
# Runs as user service (openclaw-gateway.service), Restart=always, RestartSec=5
```

Memory limits (`~/.config/systemd/user/openclaw-gateway.service.d/limits.conf`):
```ini
[Service]
MemoryMax=4G
MemoryHigh=3G
MemorySwapMax=0
```

---

## Phase 1 — Postgres Foundation ✅
*Completed 10/02/2026*

### Install (bare metal, not Docker)
```bash
sudo apt install -y postgresql-18 postgresql-18-pgvector
sudo -u postgres createuser --superuser shad
sudo -u postgres createdb openclaw_db -O shad
psql openclaw_db -c 'CREATE EXTENSION vector;'
```

### Config
- **Postgres 18.1** bare metal, localhost only
- **pgvector 0.8.1** for embeddings
- **Single DB:** `openclaw_db` with two schemas (`memory` + `ops`)
- **Auth:** Unix socket peer auth (no password needed for local user `shad`)
- **Connection:** `postgresql://shad@localhost:5432/openclaw_db` via `/var/run/postgresql`

### Schemas
**memory schema:** `memories`, `daily_notes`, `agent_profiles`
**ops schema:** `workflows`, `runs`, `steps`, `stories`, `tasks`, `agent_events`, `subscriptions`, `fx_rates`, `cost_snapshots`

### Decision: One DB, two schemas
- Simpler than two databases
- Cross-schema queries possible (`memory.memories JOIN ops.agent_events`)
- Single connection string for Prisma

---

## Phase 2 — Memory Migration ✅
*Completed 10/02/2026*

- Imported 14 memories + 1 daily note from markdown files
- Embeddings: OpenAI text-embedding-3-small (1536 dimensions)
- Hybrid search: vector similarity + keyword matching

---

## Phase 3 — Agent Integration ✅
*Completed 10/02/2026*

Tool: `tools/pg-memory.mjs`
- Commands: search, insert, log, daily, stats
- Vector similarity search with cosine distance
- Activity logging to `ops.agent_events`

---

## Phase 4 — Workflow Engine ✅
*Completed 10/02/2026*

Tool: `tools/workflow-runner.mjs`
- YAML workflow definitions (`workflows/` directory)
- Multi-step execution with agent assignment
- Status tracking: pending → running → completed/failed
- Tested with `research-summarize.yaml`

---

## Phase 5 — Agent Leveling ✅
*Completed 10/02/2026*

Tool: `tools/agent-levels.mjs`
- 4 levels: Observer (L1) → Advisor (L2) → Operator (L3) → Autonomous (L4)
- All agents seeded at L1
- Performance reviews + promotion tracking

---

## Phase 6 — Mission Control Dashboard ✅
*Completed 22/02/2026*

- **Repo:** `github.com/shad0matic/oclaw-ops`
- **Local path:** `/home/openclaw/projects/oclaw-ops/`
- **Stack:** Next.js 15 + Drizzle ORM + Tailwind + shadcn/ui
- **Spec:** `SPEC.md` in repo root
- **Access:** Tailscale only (port 3000), no auth

### Install
```bash
cd ~/projects
git clone https://github.com/shad0matic/oclaw-ops.git
cd oclaw-ops/dashboard
cp .env.example .env   # Configure DATABASE_URL
npm install
npm run build
```

### Process Management (PM2)
```bash
# Install PM2 globally
npm install -g pm2

# Start dashboard
cd ~/projects/oclaw-ops/dashboard
pm2 start npm --name "dashboard" -- start -- -H 127.0.0.1

# Save PM2 process list (survives reboot)
pm2 save

# Enable PM2 auto-start on reboot (requires sudo)
pm2 startup
# Then run the sudo command it outputs
```

### Common Commands
```bash
pm2 restart dashboard      # Graceful restart
pm2 logs dashboard         # View logs
pm2 list                   # Show status
~/scripts/dashboard-restart.sh  # Build + restart
```

### Restart Script
File: `~/scripts/dashboard-restart.sh`
```bash
#!/bin/bash
PM2=~/.npm-global/bin/pm2
cd ~/projects/oclaw-ops/dashboard
npm run build && $PM2 restart dashboard
```

### Tailscale Serve
```bash
# Expose dashboard via Tailscale (HTTPS on port 3000)
tailscale serve --https=3000 http://127.0.0.1:3000
```

Access: `https://vps-ovh.tail404904.ts.net/`

---

## Gmail / Calendar Integration ✅
*Completed 10/02/2026*

### How it works
```
Gmail → Google Pub/Sub → Tailscale Funnel → gog watch serve (:8788) → OpenClaw webhook hook → Kevin
```

### Components
- **gog CLI** v0.9.0 — Google API CLI (Gmail, Calendar, Drive, etc.)
- **Account:** kevin.ovilclaw@gmail.com
- **GCP project:** `kevin-openclaw`
- **OAuth:** Desktop app credentials, stored in `~/.config/gogcli/`
- **Keyring:** File-based (`GOG_KEYRING_PASSWORD` env var in systemd unit)

### Systemd service
File: `~/.config/systemd/user/gog-gmail-watch.service`
```ini
[Unit]
Description=gog Gmail watch (Pub/Sub → OpenClaw)
After=network.target

[Service]
Environment=GOG_KEYRING_PASSWORD=<redacted>
Environment=PATH=/home/linuxbrew/.linuxbrew/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/bin/openclaw webhooks gmail run --account kevin.ovilclaw@gmail.com
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
```

### Sending email (from Kevin)
```bash
GOG_KEYRING_PASSWORD=<password> gog gmail send \
  --account kevin.ovilclaw@gmail.com \
  --to recipient@example.com \
  --subject "Subject" \
  --body "Body text" \
  --no-input
```

### Status check
```bash
systemctl --user status gog-gmail-watch.service
```

### What works ✅
- Receiving email notifications (real-time via Pub/Sub)
- Sending email (via `gog gmail send`)

### Not yet tested
- Calendar notifications
- Google Drive access

---

## Cost Tracking ✅
*Completed 10/02/2026*

Tool: `tools/cost-tracker.mjs`
- 8 subscriptions tracked in `ops.subscriptions`
- Daily ECB FX rate for USD→EUR conversion
- Hourly cost snapshots
- **Monthly total:** €201.11 (€164.29 OpenClaw-related)

---

## TTS / STT ✅
- **TTS:** ElevenLabs, voice "The Elf" (id: e79twtVS2278lVZZQiAD)
- **STT:** OpenAI Whisper API
- Dedicated Telegram voice topic (thread 754)

---

## Cron Jobs

### System crontab (user: shad)
```bash
# State backup — daily 02h00 UTC
0 2 * * * tar czf /home/shad/backups/openclaw/state-$(date +\%Y\%m\%d).tar.gz /home/shad/.openclaw/ 2>/dev/null

# Workspace backup + pg_dump — daily 03h00 UTC
0 3 * * * /home/shad/.openclaw/workspace/scripts/backup-openclaw.sh >> /home/shad/backups/openclaw/backup.log 2>&1

# Watchdog — every 2min
*/2 * * * * /usr/local/bin/openclaw-watchdog.sh

# Auto-update — daily 04h00 UTC
0 4 * * * openclaw update && systemctl --user restart openclaw-gateway.service

# Old backup cleanup — 14 days, daily 05h00 UTC
0 5 * * * find /home/shad/backups/openclaw/state-*.tar.gz -mtime +14 -delete 2>/dev/null

# Log cleanup — daily 05h30 UTC
30 5 * * * /home/shad/.openclaw/workspace/scripts/cleanup-logs.sh >> /home/shad/backups/openclaw/backup.log 2>&1
```

### OpenClaw cron jobs
- **Weekly update check:** Monday 08h00 UTC → Telegram topic 710
- **Hourly cost snapshot:** :05 past each hour
- **Daily FX rate:** 07:00 UTC (ECB)

---

## Pending / Blocked

- [ ] Calendar notifications testing
- [ ] Google Drive testing
- [ ] `webhook.glubi.com` DNS (alternative to Tailscale Funnel)
- [ ] `drop.glubi.com` DNS + Nginx file drop
- [x] Phase 6 — Mission Control Dashboard ✅
- [ ] Phase 7 — Cross-Agent Intelligence (post ski holiday)

---

## Troubleshooting

### Gateway won't start
```bash
openclaw gateway status
journalctl --user -u openclaw-gateway -n 50
systemctl --user restart openclaw-gateway
```

### Dashboard not responding
```bash
pm2 list                    # Check status
pm2 logs dashboard          # View logs
pm2 restart dashboard       # Restart

# If PM2 not running:
cd ~/projects/oclaw-ops/dashboard
pm2 start npm --name "dashboard" -- start -- -H 127.0.0.1
```

### Gmail watch not working
```bash
systemctl --user status gog-gmail-watch
systemctl --user restart gog-gmail-watch
journalctl --user -u gog-gmail-watch -n 50
```

### Postgres
```bash
sudo systemctl status postgresql
psql openclaw_db -c 'SELECT 1;'
```

### Memory limits
```bash
systemctl --user show openclaw-gateway | grep Memory
```

---

## Security Hardening

### Access Control Layers

The OpenClaw system implements multiple layers of security:

1. **Tailscale VPN Only** — All services are accessible only via Tailscale VPN
   - Dashboard: `https://vps-ovh.tail404904.ts.net` (port 3000)
   - Gateway: `ws://vps-ovh.tail404904.ts.net:18789`
   - No public internet exposure

2. **Telegram Allowlist** — Only approved users can message the bot
   - Configured in `~/.openclaw/openclaw.json`:
   ```json
   {
     "channels": {
       "telegram": {
         "allowFrom": ["1868676790"],
         "groupAllowFrom": ["1868676790"],
         "dmPolicy": "allowlist",
         "groupPolicy": "allowlist"
       }
     }
   }
   ```

3. **Dashboard Authentication** — NextAuth with password protection
   - Configured via `ADMIN_PASSWORD` in dashboard `.env`
   - Users must enter password to access Mission Control
   - Session lasts 30 days

4. **Gateway Token Auth** — API calls require valid token
   - Token configured in `openclaw.json`:
   ```json
   {
     "gateway": {
       "auth": {
         "mode": "token",
         "token": "c622d1fb7d2c09755d1635297339d17eaa95967f35ee9efc"
       }
     }
   }
   ```

### Adding New Users

1. **Telegram:** Get user ID from @userinfobot, add to `allowFrom` array
2. **Tailscale:** Run `tailscale up` and approve device in Tailscale admin
3. **Dashboard:** Share ADMIN_PASSWORD securely

### Security Best Practices

- Never commit passwords or tokens to git
- Use `.env` files for sensitive config (already in `.gitignore`)
- Rotate tokens periodically
- Review Tailscale ACLs for least-privilege access

---

*This guide is updated as each phase is completed. Check git history for changes.*
