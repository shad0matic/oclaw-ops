# Postgres Setup — openclaw_db

**Created:** 10/02/2026
**PG Version:** 18.1 | **pgvector:** 0.8.1
**Host:** localhost (unix socket `/var/run/postgresql`)
**DB:** `openclaw_db` | **User:** `shad` (peer auth)

---

## Schemas

### memory (private brain)
| Table | Purpose |
|-------|---------|
| `memories` | Long-term memories with vector(1536) embeddings |
| `daily_notes` | Daily markdown mirrors (one per date) |
| `agent_profiles` | Agent identity + level (1-4) + trust score |
| `performance_reviews` | Level change history + feedback |

### ops (shared operations)
| Table | Purpose |
|-------|---------|
| `agent_events` | Activity log (actions, tokens, costs) |
| `tasks` | Workflow task queue with atomic claiming |

---

## Security
- `listen_addresses = 'localhost'` — no external access
- Port 5432 bound to 127.0.0.1 and ::1 only
- Peer auth for local unix socket connections
- No TCP password configured (not needed — local only)

## Timezone
Server TZ set to `Europe/Paris` (CET/CEST). Postgres stores `TIMESTAMPTZ` in UTC internally, displays in session TZ.
```bash
# Set system TZ
sudo timedatectl set-timezone Europe/Paris
# Verify in Postgres
psql -d openclaw_db -c "SHOW timezone;"
```

---

## Connection
```javascript
import pg from 'pg';
const pool = new pg.Pool({ database: 'openclaw_db', host: '/var/run/postgresql' });
```

```bash
psql -d openclaw_db
```

---

## Tools

| Script | Purpose |
|--------|---------|
| `tools/pg-import-memories.mjs` | Import markdown → Postgres with embeddings (idempotent) |
| `tools/pg-memory.mjs` | Search/insert/log helper (Phase 3) |
| `tools/workflow-runner.mjs` | Register/run/status workflows (Phase 4) |
| `workflows/*.yaml` | Workflow definitions |
| `tools/agent-levels.mjs` | Agent leveling system (Phase 5) |

---

## Embeddings
- Model: `text-embedding-3-small` (OpenAI)
- Dimensions: 1536
- Index: IVFFlat (cosine) — will rebuild once >1000 rows
- Cost: ~€0.01/1000 chunks

---

## Backup
- Included in daily backup script (`scripts/backup-openclaw.sh`)
- Future: add `pg_dump -Fc openclaw_db` step

---

## Phase Progress

- [x] **Phase 1** — Foundation: PG 18 + pgvector + schemas + indexes
- [x] **Phase 2** — Memory migration: 14 memories + 1 daily note imported with embeddings
- [x] **Phase 3** — Agent integration: pg-memory helper, dual-read from Postgres
- [x] **Phase 4** — Workflow engine: Antfarm-style on Postgres
- [x] **Phase 5** — Agent leveling: 4-level system
- [ ] **Phase 6** — Mission Control UI
- [ ] **Phase 7** — Cross-agent intelligence

Full roadmap: `memory/roadmap-postgres-upgrade.md`
