# Mission Control Dashboard Documentation

> Mobile-first dark dashboard for monitoring Kevin (OpenClaw AI agent system)

## Overview

Mission Control is a Next.js 16 dashboard that provides real-time monitoring and management for the OpenClaw AI agent system. It offers KPI tracking, agent management, workflow orchestration, memory browsing, and cost monitoring.

## Quick Start

```bash
cd dashboard
npm install
npx prisma generate
npm run dev
```

Access at `http://localhost:3000` (Tailscale-only in production)

## Features Implemented

### Core Pages

#### 1. Overview (`/`)
- **KPI Cards**: System status, token usage, server load, active runs, completed tasks
- **Agent Strip**: Horizontal scroll with agent status indicators
- **Activity Feed**: Last 20 events with filtering
- **Data Refresh**: Auto-refresh every 30s

#### 2. Agent Management (`/agents`, `/agents/[id]`)
- **List View**: Agent roster with summary stats
- **Detail View**: Tabbed interface (Overview, Activity, Reviews, Config)
- **Actions**: 
  - Promote/demote agent levels (L1-L4)
  - Add performance reviews with ratings
- **APIs**:
  - `GET /api/agents` - List all agents
  - `GET /api/agents/[id]` - Get agent details
  - `POST /api/agents/[id]/review` - Submit review
  - `POST /api/agents/[id]/promote` - Promote level
  - `POST /api/agents/[id]/demote` - Demote level

#### 3. Workflows (`/workflows`)
- **List View**: All workflows with status badges
- **Run Trigger**: Modal with task description + optional JSON context
- **API**:
  - `GET /api/workflows` - List workflows
  - `POST /api/workflows/[id]/run` - Trigger run

#### 4. Runs (`/runs`, `/runs/[id]`)
- **List View**: Run history with filters (status, workflow, agent, date)
- **Detail View**: Step timeline with input/output/error display
- **Actions**: Retry failed runs, cancel running (backend stub)
- **APIs**:
  - `GET /api/runs` - List runs (with filters)
  - `GET /api/runs/[id]` - Get run details with steps

#### 5. Memory (`/memory`)
- **Search**: Functional text search across memories and daily notes
- **Browse**: Memories and Daily Notes tabs
- **Stats**: Total counts, average importance, top tags
- **APIs**:
  - `POST /api/memory/search` - Search memories/notes
  - `GET /api/memory/stats` - Memory statistics

#### 6. Events (`/events`)
- **Feed**: Full event log with filters (agent, event type, date)
- **API**: `GET /api/events` - List events with filters

#### 7. System (`/system`)
- **Metrics**: CPU, Memory, Disk usage with live charts
- **Database**: Size and connection count
- **Info**: Uptime, OpenClaw version, backup countdown
- **API**: `GET /api/system/health` - System metrics

### Phase 7 Features

#### 8. Priorities (`/priorities`)
- **View**: Priority stack with severity badges
- **API**:
  - `GET /api/priorities` - List priorities
  - `POST /api/priorities` - Create priority
  - `PATCH /api/priorities/[id]` - Update priority

#### 9. Knowledge Graph (`/knowledge`)
- **View**: Entity list with types and aliases
- **API**:
  - `GET /api/knowledge/entities` - List entities
  - `POST /api/knowledge/entities` - Create entity

#### 10. Mistakes Log (`/mistakes`)
- **View**: Mistake tracker with severity levels
- **API**:
  - `GET /api/mistakes` - List mistakes
  - `POST /api/mistakes` - Log mistake
  - `PATCH /api/mistakes/[id]` - Update/resolve

#### 11. Reactions Matrix (`/reactions`)
- **View**: Trigger-responder reaction rules
- **API**:
  - `GET /api/reactions` - List reactions
  - `POST /api/reactions` - Create reaction
  - `PATCH /api/reactions/[id]` - Update reaction
  - `DELETE /api/reactions/[id]` - Delete reaction

#### 12. Cost Tracking (`/costs`)
- **View**: Monthly fixed costs + variable snapshots
- **API**:
  - `GET /api/costs/subscriptions` - List subscriptions
  - `GET /api/costs/snapshots` - Get cost snapshots
  - `POST /api/costs/subscriptions` - Add subscription

#### 13. Memory Compounds (`/compounds`)
- **View**: Periodic memory summaries with learnings/mistakes
- **API**: `GET /api/compounds` - List compounds

## Design System

### Theme
- **Default**: Dark mode (slate/zinc)
- **Toggle**: Light/dark switcher in sidebar
- **Accent**: Amber/yellow (#FBB040)

### Status Colors
- Green: Success/completed
- Red: Error/failed
- Amber: Warning
- Blue: Running/active
- Gray: Idle/pending

### Accessibility (WCAG 2.1 AA)
- Contrast ratio: 4.5:1 (text), 3:1 (large/UI)
- Keyboard navigation: All interactive elements
- Focus rings: Visible amber indicators
- ARIA labels: Icons, badges, charts
- Screen reader: Status text, not just color

### Motion
- Framer Motion: Available via `/components/ui/motion.tsx`
- Duration: Max 300ms
- Respect `prefers-reduced-motion`

### Mobile
- Bottom nav: Top 5 items + hamburger menu
- Breakpoint: 768px
- Single column layout

## Database Schema

### Memory Schema
- `agent_profiles` - Agent identity, level, trust, task counts
- `memories` - Long-term memories with embeddings
- `daily_notes` - Daily log with embeddings
- `performance_reviews` - Level change history
- `compounds` - Periodic summaries
- `entities` - Knowledge graph nodes
- `entity_relations` - Knowledge graph edges
- `mistakes` - Mistake log

### Ops Schema
- `workflows` - YAML workflow definitions
- `runs` - Workflow execution instances
- `steps` - Individual step executions
- `tasks` - Generic task queue
- `agent_events` - Activity log (tokens, costs)
- `subscriptions` - Monthly service costs
- `cost_snapshots` - Hourly cost aggregation
- `fx_rates` - USD→EUR exchange rates
- `priorities` - Priority stack
- `cross_signals` - Priority signals
- `reactions` - Reaction rules

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Postgres 18 + pgvector 0.8.1
- **ORM**: Prisma 7 (multi-schema)
- **UI**: shadcn/ui + Tailwind 4
- **Charts**: Recharts
- **Auth**: NextAuth 5
- **Notifications**: Sonner
- **Theme**: next-themes
- **Motion**: Framer Motion

## Known Limitations

1. **Memory Search**: Text-based only (no vector embeddings in UI)
2. **Workflow Cancel**: Backend stub (needs workflow engine integration)
3. **CSV Export**: Not implemented (events page)
4. **File Drop**: Not implemented (Phase 8 feature)
5. **Knowledge Graph**: List view only (no graph visualization)

## Development

### Build
```bash
npm run build
```

### Deploy
- Behind Nginx reverse proxy
- Tailscale-only access
- No auth needed (network-level security)

### Environment
Create `.env` from `.env.example`:
```
DATABASE_URL=postgresql://...
AUTH_SECRET=...
AUTH_URL=http://localhost:3000
```

## Support

For issues or questions, see SPEC.md for detailed specifications.
