# OpenClaw Applications Architecture

**Status:** Draft  
**Author:** Kevin 🍌  
**Date:** 2026-02-20  

---

## Vision

Structured architecture for building, deploying, and monitoring practical applications built with OpenClaw (trading bots, automation tools, etc.)

---

## Repository Structure

### New Repo: `oclaw-apps`

```
oclaw-apps/
├── packages/
│   ├── core/                           # Shared utilities
│   │   ├── telegram-alerts/            # Unified alert system
│   │   ├── db-client/                  # Postgres connection pooling
│   │   ├── monitoring/                 # Metrics collection
│   │   └── config/                     # Shared config schemas
│   │
│   ├── polymarket-bot/                 # First application
│   │   ├── src/
│   │   │   ├── engine/                 # Trading engine
│   │   │   ├── strategies/             # Strategy modules
│   │   │   ├── api/                    # Polymarket API client
│   │   │   └── index.ts
│   │   ├── config/
│   │   │   ├── production.json
│   │   │   └── development.json
│   │   ├── systemd/
│   │   │   └── polymarket-bot.service
│   │   ├── scripts/
│   │   │   ├── deploy.sh
│   │   │   └── rollback.sh
│   │   └── package.json
│   │
│   └── [future apps]/                  # More apps follow same pattern
│
├── dashboard/                          # Unified monitoring dashboard
│   ├── app/
│   │   ├── page.tsx                    # Overview: all apps
│   │   ├── polymarket/
│   │   │   └── page.tsx                # Polymarket-specific
│   │   └── layout.tsx
│   ├── components/
│   │   ├── app-card.tsx                # Reusable app status card
│   │   ├── metrics-chart.tsx
│   │   ├── alert-feed.tsx
│   │   └── emergency-stop.tsx
│   └── lib/
│       └── api-client.ts               # Fetch from app APIs
│
├── infrastructure/
│   ├── postgres/
│   │   ├── schemas/
│   │   │   ├── app_polymarket.sql
│   │   │   └── app_shared.sql
│   │   └── migrations/
│   ├── nginx/
│   │   ├── dashboard.conf
│   │   └── apps-proxy.conf
│   └── monitoring/
│       ├── prometheus.yml
│       └── grafana-dashboards/
│
└── docs/
    ├── app-template.md                 # How to add new apps
    ├── deployment.md
    └── monitoring.md
```

---

## Deployment Pattern

### Each App Gets:

**1. Systemd Service**
```ini
[Unit]
Description=Polymarket Trading Bot
After=postgresql.service network.target

[Service]
Type=simple
User=openclaw
WorkingDirectory=/home/openclaw/oclaw-apps/packages/polymarket-bot
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=CONFIG_PATH=/home/openclaw/.openclaw/apps/polymarket.json

[Install]
WantedBy=multi-user.target
```

**2. Dedicated DB Schema**
- `app_polymarket` schema in `openclaw_db`
- Isolated tables for positions, trades, metrics
- Shared `app_shared` schema for common tables

**3. Config File**
- `~/.openclaw/apps/polymarket.json`
- API keys, risk limits, strategy params
- Hot-reloadable (no restart needed)

**4. Logging**
- `/var/log/openclaw-apps/polymarket/app.log`
- Structured JSON logs
- Rotation: daily, keep 30 days

**5. Health Endpoint**
- Each app exposes `/health` on dedicated port
- Dashboard polls every 30s

---

## Monitoring Dashboard

### Unified View: `http://dashboard.openclaw.local`

**Overview Page (`/`)**
- Grid of app cards
- Each card shows:
  - Status (running/stopped/error)
  - Current metrics (P&L, positions, etc.)
  - Last heartbeat
  - Quick actions (pause/stop/restart)

**Per-App Pages (`/polymarket`, `/future-app`)**
- Real-time metrics
- Historical charts
- Trade/event logs
- Strategy controls
- Emergency stop button

**Shared Components**
- Alert feed (all apps)
- System health (CPU, memory, DB)
- Log viewer (unified search across apps)

---

## Project Organization (Kanban)

### Structure

**Projects:**
- `polymarket-bot` 📊
- `oclaw-apps-infra` 🏗️ (shared infrastructure)
- Future: `[app-name]` with emoji

**Tagging:**
- Tag all app projects with `#app` label
- Tag infra tasks with `#infra`

**Infra Project Tasks:**
- Repo setup
- Shared utilities (`@oclaw-apps/core`)
- Monitoring dashboard
- Deployment scripts
- DB schema management

---

## Development Workflow

### Creating a New App

1. **Scaffold from template**
   ```bash
   npm run create-app --name=my-bot --port=3010
   ```

2. **Develop locally**
   ```bash
   cd packages/my-bot
   npm run dev
   ```

3. **Add to dashboard**
   - Create `dashboard/app/my-bot/page.tsx`
   - Add card to overview

4. **Deploy**
   ```bash
   npm run deploy --app=my-bot --env=production
   ```

5. **Create systemd service**
   - Copy template
   - Enable & start

---

## Database Schema

### Shared Schema (`app_shared`)
```sql
CREATE SCHEMA IF NOT EXISTS app_shared;

-- App registry
CREATE TABLE app_shared.apps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT,
  status TEXT, -- running, stopped, error
  last_heartbeat TIMESTAMPTZ,
  config JSONB
);

-- Unified metrics
CREATE TABLE app_shared.metrics (
  id BIGSERIAL PRIMARY KEY,
  app_id TEXT REFERENCES app_shared.apps(id),
  metric_name TEXT,
  value NUMERIC,
  metadata JSONB,
  ts TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts
CREATE TABLE app_shared.alerts (
  id BIGSERIAL PRIMARY KEY,
  app_id TEXT REFERENCES app_shared.apps(id),
  severity TEXT, -- info, warning, critical
  message TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  ts TIMESTAMPTZ DEFAULT NOW()
);
```

### Per-App Schema (`app_polymarket`)
```sql
CREATE SCHEMA IF NOT EXISTS app_polymarket;

-- App-specific tables
CREATE TABLE app_polymarket.positions (...);
CREATE TABLE app_polymarket.trades (...);
CREATE TABLE app_polymarket.strategies (...);
```

---

## Monitoring & Alerts

### Telegram Alerts

**Topic Structure:**
- **Topic 4706** — Kanban (task management)
- **Topic 7757** — Polymarket Bot (all bot alerts/updates)
- **Topic 7762** — Apps Infrastructure (deployment/infra updates)
- Future apps get their own dedicated topics

**Alert Types per App:**
- Info: New positions, strategy changes, daily summaries
- Warning: Near risk limits, API errors, slow performance
- Critical: Emergency stop, unexpected losses, system failures

### Dashboard Alerts
- Visual notifications in UI
- Sound alerts for critical events
- Email digest (daily summary)

### Prometheus Metrics (Future)
- Scrape `/metrics` endpoint from each app
- Grafana dashboards
- Historical analysis

---

## Security

### API Keys
- Stored in `~/.openclaw/apps/*.json`
- File permissions: `600` (owner only)
- Never in git
- Rotate monthly

### Network
- Apps run on localhost-only ports
- Nginx reverse proxy with auth
- Dashboard: password protected or Tailscale only

### Database
- App schemas isolated
- Row-level security policies
- Read-only replicas for dashboard

---

## Rollout Plan

### Phase 1: Infrastructure Setup
1. Create `oclaw-apps` repo
2. Set up monorepo (pnpm workspaces)
3. Build `@oclaw-apps/core` package
4. Create dashboard skeleton

### Phase 2: Polymarket Migration
1. Migrate Polymarket bot code to new structure
2. Create systemd service
3. Set up DB schema
4. Add to dashboard

### Phase 3: Production Hardening
1. Implement health checks
2. Set up log rotation
3. Deploy monitoring
4. Write runbooks

### Phase 4: Template & Docs
1. Create app template
2. Document deployment process
3. CI/CD pipeline
4. Backup strategy

---

## Future Enhancements

- **Multi-environment support** (dev/staging/prod)
- **Blue-green deployments**
- **A/B testing framework** for strategies
- **Backtesting infrastructure** (historical replay)
- **Auto-scaling** (multiple bot instances)

---

## Success Criteria

- [ ] Repo created with clean structure
- [ ] Core utilities package working
- [ ] Dashboard showing Polymarket status
- [ ] Polymarket bot deployed via systemd
- [ ] Alerts flowing to Telegram
- [ ] Template ready for next app
