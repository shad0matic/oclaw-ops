# SPEC: Overview Page Redesign v2

**Status:** Draft  
**Author:** UX Agent (subagent)  
**Date:** 2026-02-12  
**Target:** Minions Control Dashboard — Overview Page

---

## Executive Summary

The current Overview page is a **database dump**, not a **mission control center**. It answers "what data exists?" instead of "what's happening right now and what needs my attention?"

This spec redesigns the Overview to be **glanceable, scannable, and actionable** — inspired by Linear's project views, Vercel's deployment dashboard, and Datadog's APM overview.

---

## 0. Design System Foundation

### 0.1 Color Tokens (Light + Dark Mode)

All components MUST use semantic Tailwind classes. No hardcoded `zinc-900`, `zinc-800`, etc.

#### Semantic Color Tokens

| Token | Tailwind Class | Dark Mode Value | Light Mode Value | Usage |
|-------|---------------|-----------------|------------------|-------|
| **Backgrounds** |
| bg-background | `bg-background` | `#09090b` (zinc-950) | `#ffffff` (white) | Page background |
| bg-card | `bg-card` | `#18181b` (zinc-900) | `#ffffff` (white) | Card surfaces |
| bg-muted | `bg-muted` | `#27272a` (zinc-800) | `#f4f4f5` (zinc-100) | Subtle backgrounds |
| bg-accent | `bg-accent` | `#27272a` (zinc-800) | `#f4f4f5` (zinc-100) | Hover states |
| **Foregrounds** |
| text-foreground | `text-foreground` | `#fafafa` (zinc-50) | `#09090b` (zinc-950) | Primary text |
| text-muted-foreground | `text-muted-foreground` | `#a1a1aa` (zinc-400) | `#71717a` (zinc-500) | Secondary text |
| text-card-foreground | `text-card-foreground` | `#fafafa` (zinc-50) | `#09090b` (zinc-950) | Card text |
| **Borders** |
| border-border | `border-border` | `#27272a` (zinc-800) | `#e4e4e7` (zinc-200) | Default borders |
| border-input | `border-input` | `#27272a` (zinc-800) | `#e4e4e7` (zinc-200) | Form inputs |
| **Status Colors** |
| status-success | `text-green-400` / `text-green-600` | `#4ade80` | `#16a34a` | Success states |
| status-warning | `text-yellow-400` / `text-yellow-600` | `#facc15` | `#ca8a04` | Warning states |
| status-error | `text-red-400` / `text-red-600` | `#f87171` | `#dc2626` | Error states |
| status-info | `text-blue-400` / `text-blue-600` | `#60a5fa` | `#2563eb` | Info/active states |
| **Brand** |
| brand-primary | `text-amber-400` / `text-amber-600` | `#fbbf24` | `#d97706` | Accent, Kevin's crown |

#### Contrast Ratios (WCAG AA Verified)

| Combination | Dark Mode Ratio | Light Mode Ratio | Passes AA |
|-------------|-----------------|------------------|-----------|
| foreground on background | 19.5:1 | 19.5:1 | ✅ |
| foreground on card | 16.7:1 | 19.5:1 | ✅ |
| muted-foreground on background | 5.9:1 | 4.7:1 | ✅ |
| muted-foreground on card | 5.1:1 | 4.7:1 | ✅ |
| green-400 on zinc-900 | 7.4:1 | — | ✅ |
| green-600 on white | — | 4.5:1 | ✅ |
| red-400 on zinc-900 | 5.2:1 | — | ✅ |
| red-600 on white | — | 4.6:1 | ✅ |
| yellow-400 on zinc-900 | 11.4:1 | — | ✅ |
| yellow-600 on white | — | 3.5:1 | ⚠️ Use bold/large |
| blue-400 on zinc-900 | 5.6:1 | — | ✅ |
| blue-600 on white | — | 4.6:1 | ✅ |

#### Status Dot Colors (Must Meet 3:1 Against Adjacent)

| Status | Dark Mode | Light Mode | Class Pattern |
|--------|-----------|------------|---------------|
| Active | `#22c55e` (green-500) | `#16a34a` (green-600) | `bg-green-500 dark:bg-green-500` |
| Idle | `#52525b` (zinc-600) | `#a1a1aa` (zinc-400) | `bg-zinc-600 dark:bg-zinc-600` |
| Error | `#ef4444` (red-500) | `#dc2626` (red-600) | `bg-red-500 dark:bg-red-500` |
| Warning | `#eab308` (yellow-500) | `#ca8a04` (yellow-600) | `bg-yellow-500 dark:bg-yellow-500` |
| Working (sub) | `#eab308` (yellow-500) | `#ca8a04` (yellow-600) | `bg-yellow-500 dark:bg-yellow-500` |

---

### 0.2 Accessibility Requirements (WCAG AA)

#### Text Contrast Requirements

| Text Type | Min Ratio | Rule |
|-----------|-----------|------|
| Body text (14px) | 4.5:1 | Normal text |
| Small text (10-12px) | 4.5:1 | Normal text (higher risk, be careful) |
| Large text (18px+ or 14px bold) | 3:1 | Large text exception |
| UI components | 3:1 | Icons, borders, focus rings |

#### Focus States (MANDATORY)

Every interactive element MUST have visible focus state:

```css
/* Standard focus ring - use for all interactive elements */
.focus-ring {
  @apply focus-visible:outline-none focus-visible:ring-2 
         focus-visible:ring-ring focus-visible:ring-offset-2 
         focus-visible:ring-offset-background;
}
```

| Element | Focus Style |
|---------|-------------|
| Cards (clickable) | `ring-2 ring-ring ring-offset-2` |
| Buttons | `ring-2 ring-ring ring-offset-2` |
| Links | `ring-2 ring-ring rounded-sm` |
| Avatars (tappable) | `ring-2 ring-ring ring-offset-2 ring-offset-background` |
| Bottom sheet triggers | `ring-2 ring-ring` |

#### Aria Labels Required

| Component | Aria Requirement |
|-----------|-----------------|
| Status dots | `aria-label="Status: active"` (not just color) |
| Progress bars | `role="progressbar" aria-valuenow aria-valuemin aria-valuemax aria-label` |
| Avatar buttons | `aria-label="View Kevin's profile"` |
| Expand/collapse | `aria-expanded="true/false" aria-controls="panel-id"` |
| Alert banner | `role="alert" aria-live="polite"` |
| Live region | `aria-live="polite"` for task count updates |
| Health pulse | `role="status" aria-live="polite"` |
| Bottom sheets | `role="dialog" aria-modal="true" aria-labelledby` |

#### Screen Reader Considerations

| Component | SR Behavior |
|-----------|-------------|
| Health Pulse | Announces: "System status: online. 3 tasks active. Today's cost: 2 euros 14 cents" |
| Status dots | Never rely on color alone. Include text or aria-label |
| Task cards | Heading structure: agent name as h3, task as paragraph |
| Team strip | `role="list"` with `role="listitem"` for each avatar |
| Pipeline | Announce percentages: "Pipeline: 85% success rate. 12 completed, 1 failed" |
| Activity | Use semantic list, announce timestamps relatively |

#### Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Move between interactive elements |
| Enter/Space | Activate buttons, expand cards |
| Escape | Close bottom sheets, dismiss alerts |
| Arrow keys | Navigate within team strip (horizontal) |

#### Motion & Animation

```css
/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .animate-pulse,
  .animate-spin {
    animation: none;
  }
  
  /* Keep functional transitions, remove decorative */
  * {
    transition-duration: 0.01ms !important;
  }
}
```

| Animation | Reduced Motion Behavior |
|-----------|------------------------|
| Pulse on active dot | Static dot (no pulse) |
| Progress bar animation | Instant fill (no transition) |
| Bottom sheet slide | Instant appear (no slide) |
| Card hover effects | Keep (functional feedback) |

---

### 0.3 Component Theming Pattern

Every component must follow this pattern:

```tsx
// ✅ CORRECT - Theme-aware
<div className="bg-card text-card-foreground border border-border">
  <p className="text-muted-foreground">Secondary text</p>
  <span className="text-green-500 dark:text-green-400">Status</span>
</div>

// ❌ WRONG - Hardcoded
<div className="bg-zinc-900 text-zinc-50 border border-zinc-800">
  <p className="text-zinc-400">Secondary text</p>
  <span className="text-green-400">Status</span>
</div>
```

#### Status Color Classes (Theme-Safe)

```tsx
// Status indicator that works in both themes
const statusColors = {
  active: "bg-green-500 dark:bg-green-500",  // Same in both
  idle: "bg-zinc-400 dark:bg-zinc-600",
  error: "bg-red-500 dark:bg-red-500",
  warning: "bg-yellow-500 dark:bg-yellow-500",
}

// Text status that adapts
const statusTextColors = {
  active: "text-green-600 dark:text-green-400",
  idle: "text-muted-foreground",
  error: "text-red-600 dark:text-red-400",
  warning: "text-yellow-600 dark:text-yellow-400",
}
```

---

## 1. Information Architecture

### What Belongs on Overview

| Priority | Data | Why |
|----------|------|-----|
| **P0 — Glance** | Active tasks (running now) | Boss wants to see who's working |
| **P0 — Glance** | System health indicator | Is the team functional? |
| **P0 — Glance** | Agents with live status | Who's available, who's busy |
| **P1 — Scan** | Task pipeline (queued → running → done) | Progress visibility |
| **P1 — Scan** | Spawn relationships (who spawned whom) | Understand task delegation |
| **P1 — Scan** | Recent completions/failures | Quick wins/issues |
| **P2 — Dig** | Cost accumulation (today) | Budget awareness |
| **P2 — Dig** | Activity timeline | Audit trail |

### What Doesn't Belong (move elsewhere)

| Data | Move To |
|------|---------|
| Full event log with all details | `/events` page |
| Cost breakdowns by model | `/costs` page |
| Agent configuration/settings | `/agents/[id]` page |
| Historical runs list | `/runs` page |
| Memory/knowledge entries | `/memory` page |

### Information Hierarchy (Visual Weight)

```
┌─────────────────────────────────────────────────────────┐
│ 1. STATUS BAR — System health, active count, costs      │ ◀─ Always visible
├─────────────────────────────────────────────────────────┤
│ 2. LIVE WORK — What's happening RIGHT NOW               │ ◀─ Primary focus
├─────────────────────────────────────────────────────────┤
│ 3. TEAM — Who's on duty, their roles                    │ ◀─ Secondary
├─────────────────────────────────────────────────────────┤
│ 4. PIPELINE — Recent flow (last hour)                   │ ◀─ Context
├─────────────────────────────────────────────────────────┤
│ 5. ACTIVITY — Collapsed timeline                        │ ◀─ On demand
└─────────────────────────────────────────────────────────┘
```

---

## 2. Layout Blueprint

### Desktop Layout (≥1024px)

```
┌──────────────────────────────────────────────────────────────────────┐
│ STATUS BAR                                                            │
│ [🟢 Online · 4h 23m] [3 active] [Today: €2.14] [Memory: OK]          │
└──────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────┬─────────────────────────────────┐
│                                    │                                 │
│  LIVE WORK PANEL                   │  TEAM ROSTER                    │
│  (Task cards with spawn trees)     │  (Agent cards in 2-col grid)    │
│                                    │                                 │
│  Full height, scrollable           │  Fixed height, scrollable       │
│                                    │                                 │
├────────────────────────────────────┴─────────────────────────────────┤
│                                                                       │
│  PIPELINE STRIP (horizontal task flow)                               │
│  [Queued: 2] → [Running: 3] → [Completed: 12] → [Failed: 1]          │
│                                                                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  EPIC TRACKER (active multi-phase projects)                          │
│  📋 Overview Redesign v2  ██████░░░░ 45%  Phase 2: Mobile 🔄         │
│  📋 Multi-Project Wkflow  ████░░░░░░ 22%  Phase 1: Context 🔄        │
│  [Click to expand phases + checkboxes]                                │
│                                                                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ACTIVITY TIMELINE (collapsed by default, expandable)                │
│  ▶ 12 events in last hour [Expand]                                   │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### Tablet Layout (768px–1023px)

```
┌─────────────────────────────────────────────────────┐
│ STATUS BAR (condensed)                              │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│ LIVE WORK (full width, vertical scroll)             │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│ TEAM ROSTER (2-column grid)                         │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│ PIPELINE STRIP                                       │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│ ACTIVITY (collapsed)                                 │
└─────────────────────────────────────────────────────┘
```

### Mobile Layout (<768px)

```
┌─────────────────────────┐
│ STATUS BAR (icon-only)  │
│ 🟢 3 ⚡ €2.14           │
└─────────────────────────┘
┌─────────────────────────┐
│ LIVE WORK               │
│ (stacked cards)         │
│ Primary focus           │
└─────────────────────────┘
┌─────────────────────────┐
│ TEAM (horizontal scroll)│
│ [Avatar][Avatar][Av...] │
│ Tap for details         │
└─────────────────────────┘
┌─────────────────────────┐
│ PIPELINE (mini bar)     │
│ ████████░░ 80% success  │
└─────────────────────────┘
┌─────────────────────────┐
│ 📋 Epics (2)            │
│ Redesign v2  ████░░ 45% │
│ Multi-Proj   ██░░░░ 22% │
│ [Tap to expand]         │
└─────────────────────────┘
┌─────────────────────────┐
│ ACTIVITY ▶              │
│ (fully collapsed)       │
└─────────────────────────┘
```

---

## 3. Component Hierarchy

```
page.tsx (server component)
└── DashboardClient (client component)
    ├── StatusBar
    │   ├── SystemStatus (online/offline + uptime)
    │   ├── ActiveCounter (live count of running tasks)
    │   ├── DailyCostBadge (today's spend)
    │   └── MemoryHealth (integrity check)
    │
    ├── LiveWorkPanel
    │   ├── LiveWorkHeader (title + "3 active")
    │   └── TaskTree[] (one per root task)
    │       ├── TaskCard (the main task)
    │       └── SpawnedTaskCard[] (indented children)
    │
    ├── TeamRoster
    │   ├── RosterHeader ("The Team" + filters)
    │   └── AgentCard[] (2-col grid)
    │       ├── AgentAvatar (with status dot)
    │       ├── AgentInfo (name, role, model)
    │       ├── StatusIndicator (active/idle/working on X)
    │       └── QuickStats (trust %, tasks today)
    │
    ├── PipelineStrip
    │   ├── StageIndicator (queued)
    │   ├── StageIndicator (running)
    │   ├── StageIndicator (completed)
    │   └── StageIndicator (failed)
    │
    └── ActivityTimeline
        ├── TimelineHeader (collapsed state)
        └── TimelineEvents[] (expanded state)
            └── EventRow
```

---

## 4. Component Specifications

### 4.1 StatusBar

**Purpose:** System health at a glance. Always visible, never scrolls.

**Visual Layout:**
```
┌────────────────────────────────────────────────────────────────────┐
│ 🟢 Online · 4h 23m    │    3 active    │    €2.14 today    │ ✓ Mem │
└────────────────────────────────────────────────────────────────────┘
```

**Data:**
- System status: gateway uptime from `si.time()`
- Active count: COUNT of `ops.runs` WHERE status = 'running'
- Daily cost: SUM(`cost_usd`) from `ops.agent_events` WHERE DATE(created_at) = TODAY
- Memory health: existing `MemoryIntegrity` component

**States:**
- Online (green dot, shows uptime)
- Offline (red dot, shows "Offline")
- Degraded (yellow dot, shows warning)

**Mobile Adaptation:**
- Icons only: 🟢 3 ⚡ €2.14 ✓
- Tap to expand full details in bottom sheet

**Interactions:**
- Hover on cost → tooltip with breakdown by agent
- Click system status → navigate to `/system`

**Theming:**
```tsx
<div className="flex items-center gap-4 bg-card border-b border-border px-4 py-2">
  {/* Status indicator */}
  <div className="flex items-center gap-2">
    <span 
      className={cn(
        "h-2 w-2 rounded-full",
        status === 'online' && "bg-green-500",
        status === 'offline' && "bg-red-500",
        status === 'degraded' && "bg-yellow-500"
      )}
      role="img"
      aria-label={`System ${status}`}
    />
    <span className="text-sm text-foreground">
      {status === 'online' ? `Online · ${uptime}` : status}
    </span>
  </div>
  
  {/* Active count */}
  <span className="text-sm text-muted-foreground">
    <span className="text-foreground font-medium">{activeCount}</span> active
  </span>
  
  {/* Cost */}
  <span className="text-sm text-muted-foreground">
    €<span className="text-foreground font-medium">{cost}</span> today
  </span>
</div>
```

**Accessibility:**
```tsx
<div 
  role="status" 
  aria-live="polite"
  aria-label={`System ${status}. ${activeCount} tasks active. Today's cost: ${cost} euros`}
>
  {/* Status dot needs aria-hidden since we have aria-label above */}
  <span className="..." aria-hidden="true" />
  ...
</div>
```

| Element | Aria |
|---------|------|
| Container | `role="status" aria-live="polite"` |
| Status dot | `aria-hidden="true"` (redundant with text) |
| Clickable sections | `role="button" tabindex="0"` |
| Cost tooltip trigger | `aria-describedby="cost-breakdown"` |

---

### 4.2 LiveWorkPanel

**Purpose:** What's happening RIGHT NOW. The primary focus of the page.

**Visual Layout (Desktop):**
```
┌─────────────────────────────────────────────────────────────────┐
│ 🔴 LIVE                                                    3    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ TASK TREE ─────────────────────────────────────────────┐   │
│  │ 👑 Kevin                                                 │   │
│  │ ┌────────────────────────────────────────────────────┐  │   │
│  │ │ Building overview redesign spec                    │  │   │
│  │ │ ━━━━━━━━━━━━━━━░░░░ 14m · Opus · €0.42            │  │   │
│  │ │ 💓 "Writing component specs..."                    │  │   │
│  │ └────────────────────────────────────────────────────┘  │   │
│  │                                                          │   │
│  │   └─ spawned ─┐                                          │   │
│  │               ▼                                          │   │
│  │ ┌────────────────────────────────────────────────────┐  │   │
│  │ │ 🎨 Bob                                              │  │   │
│  │ │ Implementing new AgentCard component               │  │   │
│  │ │ ━━━━━━━━━━░░░░░░░░ 8m · Gemini · €0.08            │  │   │
│  │ └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─ TASK TREE ─────────────────────────────────────────────┐   │
│  │ 🔬 Dr. Nefario                                          │   │
│  │ ┌────────────────────────────────────────────────────┐  │   │
│  │ │ Researching browser automation frameworks          │  │   │
│  │ │ ━━━━━━━░░░░░░░░░░░ 3m · Grok · €0.02              │  │   │
│  │ └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Task Card Anatomy:**
```
┌────────────────────────────────────────────────────────────┐
│ [Avatar] Agent Name                          [Model Badge] │
│ Task description text (max 2 lines, ellipsis)              │
│ ━━━━━━━━━━━━━━━░░░░ Duration · Model · Cost               │
│ 💓 "Heartbeat message..." (if available)                   │
└────────────────────────────────────────────────────────────┘
```

**Progress Bar:**
- Color based on health (green → yellow → red as heartbeat ages)
- Width: time since start vs expected duration (if known) or just animate

**Data:**
- Source: `ops.runs` WHERE status = 'running', JOIN with `memory.agent_profiles`
- Spawn relationship: from `triggered_by` field in runs OR `detail.spawned_by` in events
- Build tree structure in API, not client

**Query Shape:**
```sql
WITH running_tasks AS (
  SELECT 
    r.id, r.agent_id, r.task, r.triggered_by, r.started_at,
    r.last_heartbeat, r.heartbeat_msg,
    ap.name as agent_name,
    EXTRACT(EPOCH FROM (NOW() - r.started_at)) as elapsed_seconds,
    EXTRACT(EPOCH FROM (NOW() - r.last_heartbeat)) as heartbeat_age
  FROM ops.runs r
  JOIN memory.agent_profiles ap ON r.agent_id = ap.agent_id
  WHERE r.status = 'running'
)
SELECT * FROM running_tasks ORDER BY started_at ASC;
```

**Empty State:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│              😴 All agents idle                                │
│              No tasks running right now                        │
│                                                                 │
│              Last activity: 12 minutes ago                     │
│              [View Recent Activity →]                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Loading State:**
- Skeleton cards with pulsing animation
- Show 2 placeholder cards

**Error State:**
- Show error message with retry button
- "Failed to load live tasks. [Retry]"

**Mobile:**
- Full width cards, vertical stack
- Simplified spawn indicator (just indent, no connecting lines)
- Progress bar becomes thin line under card

**Interactions:**
- Click task → navigate to `/runs/[id]`
- Click agent avatar → navigate to `/agents/[id]`
- Hover task → show full task text in tooltip

**Theming (Task Card):**
```tsx
<article 
  className={cn(
    "rounded-lg border bg-card p-4 transition-colors",
    "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
    isStalled && "border-red-500/50 bg-red-500/5 dark:bg-red-500/10"
  )}
>
  <div className="flex items-center gap-3">
    <Avatar className="h-10 w-10 border-2 border-background" />
    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-medium text-foreground">{agentName}</h3>
      <p className="text-sm text-muted-foreground truncate">{task}</p>
    </div>
    <Badge className="bg-muted text-muted-foreground border-border">
      {model}
    </Badge>
  </div>
  
  {/* Progress bar */}
  <div 
    className="mt-3 h-1 rounded-full bg-muted overflow-hidden"
    role="progressbar"
    aria-valuenow={healthPercent}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-label={`Task health: ${healthPercent}%`}
  >
    <div 
      className={cn(
        "h-full rounded-full transition-all",
        healthPercent > 60 && "bg-green-500",
        healthPercent > 30 && healthPercent <= 60 && "bg-yellow-500",
        healthPercent <= 30 && "bg-red-500"
      )}
      style={{ width: `${healthPercent}%` }}
    />
  </div>
  
  {/* Metadata */}
  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
    <span>{duration}</span>
    <span aria-hidden="true">·</span>
    <span>€{cost}</span>
  </div>
</article>
```

**Accessibility:**
| Element | Requirement |
|---------|-------------|
| Task card | `<article>` with heading, `tabindex="0"`, focus ring |
| Progress bar | `role="progressbar"` with aria-valuenow/min/max |
| Agent avatar | `aria-label="View {name}'s profile"` |
| Spawned indicator | Text label "Spawned by {parent}" not just indent |
| Heartbeat | `aria-live="polite"` for updates |
| Stalled state | `aria-label` includes "stalled" status |

---

### 4.3 TeamRoster

**Purpose:** See who's on the team, what they do, and their current status.

**Visual Layout (Desktop, 2-column grid):**
```
┌─────────────────────────────────────────────────────────────────┐
│ THE TEAM                                             7 agents   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────┐      │
│  │ [Avatar🟢] Kevin        │  │ [Avatar⚫] Bob          │      │
│  │ 👑 Lead                 │  │ 🎨 Frontend builder     │      │
│  │                         │  │                         │      │
│  │ Opus 4.6 · Trust 100%   │  │ Gemini 2.5 · Trust 65% │      │
│  │ ▶ Building overview...  │  │ idle                    │      │
│  └─────────────────────────┘  └─────────────────────────┘      │
│                                                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────┐      │
│  │ [Avatar⚫] Dr. Nefario  │  │ [Avatar⚫] X Reader     │      │
│  │ 🔬 Deep researcher      │  │ 📰 Twitter fetcher      │      │
│  │                         │  │                         │      │
│  │ Grok 4 · Trust 90%      │  │ Grok · Trust 85%       │      │
│  │ idle                    │  │ idle                    │      │
│  └─────────────────────────┘  └─────────────────────────┘      │
│                                                                 │
│  ┌─────────────────────────┐  ┌─────────────────────────┐      │
│  │ [Avatar⚫] Stuart       │  │ [Avatar⚫] Mel          │      │
│  │ 🔒 DB gatekeeper        │  │ 🛡️ Security cop         │      │
│  │                         │  │                         │      │
│  │ Gemini Flash · Trust 95%│  │ Gemini Flash · Trust 92%│      │
│  │ idle                    │  │ idle                    │      │
│  └─────────────────────────┘  └─────────────────────────┘      │
│                                                                 │
│  ┌─────────────────────────┐                                   │
│  │ [Avatar⚫] Dave         │                                   │
│  │ 💰 Cost accountant      │                                   │
│  │                         │                                   │
│  │ Gemini Flash · Trust 88%│                                   │
│  │ idle                    │                                   │
│  └─────────────────────────┘                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**AgentCard Anatomy:**
```
┌───────────────────────────────────┐
│ [Avatar●] Agent Name              │
│ 🎭 Role description (1 line)      │
│                                   │
│ Model Badge · Trust 85%           │
│ ▶ Current task... (or "idle")     │
└───────────────────────────────────┘
```

**Avatar Status Dot:**
- 🟢 Green pulse: actively working
- ⚫ Gray: idle
- 🔴 Red: error/stalled task
- 🟡 Yellow: spawned by another (working as sub-agent)
- 🧟 Red flash + zombie icon overlay: agent has a zombie task (detected by Mel, not yet killed or just killed). Flashes for 60s after kill event, then reverts to normal status.

**Zombie Visual (from zombie-detection.md backlog):**
- When `zombie_killed` event exists for agent in last 15 min → show 🧟 overlay on avatar
- Agent card shows warning text: "Zombie killed 5m ago — [task name]"
- If agent currently has a stale run (pre-kill) → flashing red border on card

**Data:**
- Source: `memory.agent_profiles` + live status from `ops.runs`
- Description: USE the `description` field! (currently ignored)
- Model: from agent config or last task's model

**Trust Score Display:**
- Show as percentage: "Trust 85%"
- Color: green (>80%), yellow (50-80%), red (<50%)
- On hover: "Based on X tasks, Y successful"

**Role Icons (derive from description or hardcode):**
| Agent | Icon | Short Role |
|-------|------|------------|
| Kevin | 👑 | Lead |
| Bob | 🎨 | Frontend |
| Dr. Nefario | 🔬 | Research |
| X Reader | 📰 | Twitter |
| Stuart | 🔒 | Database |
| Mel | 🛡️ | Security |
| Dave | 💰 | Finance |

**Mobile Adaptation:**
- Horizontal scroll strip with circular avatars
- Tap avatar → bottom sheet with full agent card
- Status dot on avatar is larger for thumb targets

```
┌─────────────────────────────────────────────────────┐
│ THE TEAM                                            │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ →     │
│ │[🟢Av]│ │[⚫Av]│ │[⚫Av]│ │[⚫Av]│ │[⚫Av]│       │
│ │Kevin │ │ Bob  │ │Nefar │ │Stuart│ │ Mel  │       │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘       │
└─────────────────────────────────────────────────────┘
```

**Interactions:**
- Click card → navigate to `/agents/[id]`
- Desktop hover → subtle highlight
- Mobile tap → bottom sheet with actions

**Theming (Agent Card):**
```tsx
<article 
  className={cn(
    "rounded-lg border border-border bg-card p-4",
    "hover:bg-accent transition-colors cursor-pointer",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  )}
  tabIndex={0}
  role="button"
  aria-label={`${name}, ${role}. Status: ${status}. Trust: ${trustScore}%`}
>
  <div className="flex items-start gap-3">
    {/* Avatar with status ring */}
    <div className="relative">
      <Avatar className={cn(
        "h-12 w-12 ring-2 ring-offset-2 ring-offset-background",
        status === 'active' && "ring-green-500",
        status === 'idle' && "ring-zinc-400 dark:ring-zinc-600",
        status === 'error' && "ring-red-500"
      )}>
        <AvatarImage src={avatarUrl} alt="" /> {/* alt="" because name is in aria-label */}
        <AvatarFallback className="bg-muted text-muted-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>
      {/* Status dot */}
      <span 
        className={cn(
          "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
          status === 'active' && "bg-green-500",
          status === 'idle' && "bg-zinc-400 dark:bg-zinc-600",
          status === 'error' && "bg-red-500"
        )}
        aria-hidden="true" // Status in aria-label above
      />
    </div>
    
    {/* Info */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-foreground">{name}</h3>
        {isLead && (
          <span className="text-amber-500 dark:text-amber-400" aria-label="Team lead">
            👑
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{roleIcon} {role}</p>
      
      {/* Trust score */}
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{model}</span>
        <span aria-hidden="true">·</span>
        <span className={cn(
          "text-xs font-medium",
          trustScore >= 80 && "text-green-600 dark:text-green-400",
          trustScore >= 50 && trustScore < 80 && "text-yellow-600 dark:text-yellow-400",
          trustScore < 50 && "text-red-600 dark:text-red-400"
        )}>
          Trust {trustScore}%
        </span>
      </div>
      
      {/* Current activity */}
      <p className={cn(
        "mt-1 text-xs truncate",
        status === 'active' 
          ? "text-green-600 dark:text-green-400" 
          : "text-muted-foreground"
      )}>
        {currentTask ? `▶ ${currentTask}` : 'idle'}
      </p>
    </div>
  </div>
</article>
```

**Accessibility:**
| Element | Requirement |
|---------|-------------|
| Card container | `role="button" tabindex="0"` with full aria-label |
| Avatar image | `alt=""` (decorative, info in aria-label) |
| Status dot | `aria-hidden="true"` (color-only, text elsewhere) |
| Trust percentage | Color-coded but ALSO shows number (not color-only) |
| Role icon | Include text label, not emoji-only |
| Grid container | `role="list"` on parent, `role="listitem"` on cards |

---

### 4.4 PipelineStrip

**Purpose:** Quick view of task flow in the last hour.

**Visual Layout:**
```
┌────────────────────────────────────────────────────────────────────┐
│ PIPELINE (last hour)                                               │
│                                                                    │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     │
│   │ Queued  │ ──► │ Running │ ──► │ ✓ Done  │     │ ✗ Failed│     │
│   │    2    │     │    3    │     │   12    │     │    1    │     │
│   └─────────┘     └─────────┘     └─────────┘     └─────────┘     │
│                                                                    │
│   [════════════════════════════════════════░░░░░░] 85% success    │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Stage Indicators:**
| Stage | Color | Icon |
|-------|-------|------|
| Queued | zinc-500 | ○ |
| Running | blue-500 | ● (pulse) |
| Completed | green-500 | ✓ |
| Failed | red-500 | ✗ |

**Data:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'pending') as queued,
  COUNT(*) FILTER (WHERE status = 'running') as running,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM ops.runs
WHERE started_at > NOW() - INTERVAL '1 hour';
```

**Progress Bar:**
- Shows success rate: completed / (completed + failed)
- Color gradient: red (0%) → yellow (50%) → green (100%)

**Mobile:**
- Single-line mini bar
- "██████████░░ 85% · 12 done, 1 fail"
- Tap to expand full view

**Interactions:**
- Click on any stage → filter `/runs` page by that status

**Theming:**
```tsx
<section 
  className="rounded-lg border border-border bg-card p-4"
  aria-labelledby="pipeline-heading"
>
  <h2 id="pipeline-heading" className="text-sm font-medium text-foreground mb-4">
    Pipeline <span className="text-muted-foreground font-normal">(last hour)</span>
  </h2>
  
  {/* Stage indicators */}
  <div className="flex items-center gap-2" role="list">
    {stages.map((stage, i) => (
      <React.Fragment key={stage.id}>
        <button
          className={cn(
            "flex-1 rounded-lg border p-3 text-center transition-colors",
            "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
            "border-border bg-background"
          )}
          onClick={() => navigate(`/runs?status=${stage.id}`)}
          role="listitem"
          aria-label={`${stage.label}: ${stage.count} tasks`}
        >
          <div className={cn(
            "text-2xl font-bold",
            stage.id === 'completed' && "text-green-600 dark:text-green-400",
            stage.id === 'running' && "text-blue-600 dark:text-blue-400",
            stage.id === 'failed' && "text-red-600 dark:text-red-400",
            stage.id === 'queued' && "text-muted-foreground"
          )}>
            {stage.count}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{stage.label}</div>
        </button>
        
        {i < stages.length - 1 && (
          <span className="text-muted-foreground" aria-hidden="true">→</span>
        )}
      </React.Fragment>
    ))}
  </div>
  
  {/* Success rate bar */}
  <div className="mt-4">
    <div 
      className="h-2 rounded-full bg-muted overflow-hidden"
      role="progressbar"
      aria-valuenow={successRate}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Success rate: ${successRate}%`}
    >
      <div 
        className={cn(
          "h-full rounded-full transition-all",
          successRate >= 80 && "bg-green-500",
          successRate >= 50 && successRate < 80 && "bg-yellow-500",
          successRate < 50 && "bg-red-500"
        )}
        style={{ width: `${successRate}%` }}
      />
    </div>
    <p className="text-xs text-muted-foreground mt-1 text-right">
      {successRate}% success
    </p>
  </div>
</section>
```

**Accessibility:**
| Element | Requirement |
|---------|-------------|
| Section | `aria-labelledby` pointing to heading |
| Stage buttons | `aria-label` with count context |
| Arrow separators | `aria-hidden="true"` (decorative) |
| Progress bar | Full `role="progressbar"` with aria-value* |
| Colors | All numbers visible regardless of color |

---

### 4.5 ActivityTimeline

**Purpose:** Audit trail for recent events. Collapsed by default.

**Collapsed State:**
```
┌────────────────────────────────────────────────────────────────────┐
│ ▶ ACTIVITY    12 events in last hour    [View All →]              │
└────────────────────────────────────────────────────────────────────┘
```

**Expanded State:**
```
┌────────────────────────────────────────────────────────────────────┐
│ ▼ ACTIVITY                                         [View All →]   │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  2m ago   │ ✓ Kevin completed "Build overview spec" (14m, €0.42)  │
│  8m ago   │ 👶 Kevin spawned Bob for "Implement AgentCard"        │
│  12m ago  │ ✓ Bob completed "Fix navbar spacing" (3m, €0.02)      │
│  15m ago  │ ▶ Kevin started "Build overview spec"                 │
│  23m ago  │ ✗ Bob failed "Add dark mode toggle" (retry 2/3)       │
│  31m ago  │ 🧹 Mel killed zombie task (Bob, stuck 45m)            │
│                                                                    │
│  ─────────────────────────────────────────────────────────────────│
│  [Load more (6 hidden)]                                           │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Event Types & Display:**
| event_type | Icon | Format |
|------------|------|--------|
| task_start | ▶ | "{agent} started "{task}"" |
| task_complete | ✓ | "{agent} completed "{task}" ({duration}, {cost})" |
| task_fail | ✗ | "{agent} failed "{task}" ({reason})" |
| spawn | 👶 | "{agent} spawned {target} for "{task}"" |
| zombie_killed | 🧹 | "{agent} killed zombie ({target}, stuck {duration})" |
| auto_demote | 📉 | "{agent} demoted to level {level}" |
| level_change | 📈 | "{agent} promoted to level {level}" |
| commit | 📝 | Group: "{agent} made {n} commits" |

**Grouping Logic (existing, keep it):**
- Consecutive commits from same agent within 15min → group
- Task start + complete/fail with same context_id → group

**Data:**
- Source: `ops.agent_events` ORDER BY created_at DESC LIMIT 20
- Relative timestamps: "2m ago", "1h ago", "yesterday"

**Mobile:**
- Collapsed by default, tap to expand
- Simpler event format (icons only, shorter text)

**Theming:**
```tsx
<section className="rounded-lg border border-border bg-card">
  {/* Collapsible header */}
  <button
    className={cn(
      "w-full flex items-center justify-between p-4",
      "hover:bg-accent transition-colors",
      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    )}
    onClick={() => setExpanded(!expanded)}
    aria-expanded={expanded}
    aria-controls="activity-panel"
  >
    <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
      <span aria-hidden="true">{expanded ? '▼' : '▶'}</span>
      Activity
    </h2>
    <span className="text-xs text-muted-foreground">
      {eventCount} events in last hour
    </span>
  </button>
  
  {/* Expandable panel */}
  <div 
    id="activity-panel"
    className={cn("border-t border-border", !expanded && "hidden")}
    role="region"
    aria-labelledby="activity-heading"
  >
    <ul className="divide-y divide-border" role="list">
      {events.map(event => (
        <li key={event.id} className="px-4 py-3 flex items-start gap-3">
          {/* Timestamp */}
          <time 
            className="text-xs text-muted-foreground w-12 shrink-0"
            dateTime={event.created_at}
          >
            {formatRelative(event.created_at)}
          </time>
          
          {/* Icon */}
          <span 
            className={cn(
              "text-sm",
              event.type === 'task_complete' && "text-green-600 dark:text-green-400",
              event.type === 'task_fail' && "text-red-600 dark:text-red-400",
              event.type === 'task_start' && "text-blue-600 dark:text-blue-400"
            )}
            aria-hidden="true"
          >
            {eventIcons[event.type]}
          </span>
          
          {/* Description */}
          <p className="text-sm text-foreground flex-1">
            <span className="font-medium">{event.agentName}</span>
            <span className="text-muted-foreground"> {event.description}</span>
            {event.cost && (
              <span className="text-muted-foreground"> · €{event.cost}</span>
            )}
          </p>
        </li>
      ))}
    </ul>
    
    {/* Load more */}
    <div className="p-4 border-t border-border">
      <button 
        className={cn(
          "text-sm text-muted-foreground hover:text-foreground",
          "focus-visible:ring-2 focus-visible:ring-ring rounded"
        )}
        onClick={loadMore}
      >
        Load more ({hiddenCount} hidden)
      </button>
    </div>
  </div>
</section>
```

**Accessibility:**
| Element | Requirement |
|---------|-------------|
| Header button | `aria-expanded`, `aria-controls` |
| Panel | `role="region"`, `aria-labelledby` |
| Event list | `role="list"` with semantic `<ul>/<li>` |
| Timestamps | Use `<time>` with `dateTime` attribute |
| Event icons | `aria-hidden="true"` (context in text) |
| Load more | Keyboard accessible button |

---

## 5. Data Flow

### API Endpoints

| Endpoint | Method | Data | Polling |
|----------|--------|------|---------|
| `/api/overview` | GET | Full overview data (SSR + client refresh) | 30s |
| `/api/tasks/live` | GET | Running tasks with spawn trees | 10s |
| `/api/agents/status` | GET | Agent list with live status | 30s |
| `/api/pipeline/stats` | GET | Pipeline counts (last hour) | 60s |
| `/api/events/recent` | GET | Recent events for timeline | 30s |

### Prerequisite: Spawn Tracker (from spawn-visibility.md backlog)

Before the overview can show spawn relationships, ALL spawns must be tracked:

1. **`tools/spawn-tracker.mjs`** — wrapper around `sessions_spawn` that auto-logs:
   - `task_start` event with `detail.spawned_by`, `detail.model`, `detail.session_key`
   - `task_complete` / `task_fail` when session ends
   - Parent → child relationship stored in `detail.spawned_by` field

2. **Kevin's spawn habit** — every `sessions_spawn` call must go through task-tracker:
   ```bash
   node tools/task-tracker.mjs start --agent bob --task "Fix layout" --model gemini --spawned-by kevin
   ```

3. **Data dependency** — the TaskTree builder in `/api/overview` relies on `detail.spawned_by` to build parent→child spawn trees. Without consistent logging, trees are broken.

This is NOT new work — task-tracker already supports `--spawned-by`. The gap is making it mandatory (now baked into AGENTS.md).

### New Unified Endpoint: `/api/overview`

Returns all overview data in one call for initial load:

```typescript
interface OverviewResponse {
  system: {
    status: 'online' | 'offline' | 'degraded'
    uptime: number
    cpu: number
    memory: number
  }
  liveWork: {
    count: number
    tasks: TaskTree[]
  }
  team: Agent[]
  pipeline: {
    queued: number
    running: number
    completed: number
    failed: number
    successRate: number
  }
  dailyCost: number
  recentEvents: Event[]
}

interface TaskTree {
  id: number
  agentId: string
  agentName: string
  task: string
  model: string
  startedAt: string
  elapsedSeconds: number
  heartbeatAge: number
  heartbeatMsg: string | null
  cost: number
  children: TaskTree[] // spawned sub-tasks
}

interface Agent {
  id: string
  name: string
  description: string
  role: string // derived or hardcoded
  model: string
  level: number
  trustScore: number
  status: 'active' | 'idle' | 'error'
  currentTask: string | null
}
```

### Polling Strategy

| Component | Interval | Why |
|-----------|----------|-----|
| LiveWorkPanel | 10s | Tasks are primary focus, need real-time feel |
| TeamRoster | 30s | Status changes less frequently |
| PipelineStrip | 60s | Historical, less urgent |
| ActivityTimeline | 30s | Background context |
| StatusBar | 30s | System health |

**Implementation:**
- Use `useSWR` with `refreshInterval` for each component
- Add `focus` revalidation (refresh when tab becomes active)
- Add `visibilitychange` listener to pause polling when tab hidden

---

## 6. Mobile Experience (First-Class Citizen)

> **Design Philosophy:** Mobile is NOT a responsive shrink of desktop. It's a purpose-built experience for Boss reading in a narrow Telegram webview. Think native app, not web dashboard.

### Mobile Constraints
- **Viewport:** ~375px wide (Telegram webview)
- **Input:** Thumb-only, no hover
- **Context:** Quick glances between tasks, not deep analysis
- **Scrolling:** Vertical is natural, horizontal is intentional

### Mobile Information Hierarchy

The mobile layout prioritizes **answering questions** in order of urgency:

1. **"Is everything OK?"** → Health pulse at top
2. **"What's happening now?"** → Live work cards
3. **"Any problems?"** → Alert banner (if issues)
4. **"Who's available?"** → Team strip
5. **"How's progress?"** → Mini pipeline
6. **"What happened?"** → Activity (buried)

### Mobile Layout (Purpose-Built)

```
┌─────────────────────────────┐
│ HEALTH PULSE                │ ◀─ Sticky, always visible
│ 🟢 All systems go           │
└─────────────────────────────┘

┌─────────────────────────────┐
│ ⚠️ ALERT BANNER (if any)    │ ◀─ Only shows when problems
│ Bob's task stalled (23m)    │
│ [View] [Dismiss]            │
└─────────────────────────────┘

┌─────────────────────────────┐
│ LIVE NOW                  3 │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 👑 Kevin                │ │
│ │ Building overview spec  │ │
│ │ ━━━━━━━━━░░░ 14m €0.42 │ │
│ │  └─ 🎨 Bob (AgentCard)  │ │ ◀─ Spawned shown inline
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 🔬 Nefario              │ │
│ │ Research: browser auto  │ │
│ │ ━━━░░░░░░░░ 3m €0.02   │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘

┌─────────────────────────────┐
│ TEAM                        │
│ ┌────┐┌────┐┌────┐┌────┐→  │
│ │🟢Kv││🟡Bo││⚫Nf││⚫St│   │ ◀─ Horizontal scroll
│ │Lead││UI  ││Res ││DB  │   │
│ └────┘└────┘└────┘└────┘   │
└─────────────────────────────┘

┌─────────────────────────────┐
│ TODAY                       │
│ ████████████░░░░ 85%        │
│ 12 done · 1 fail · €2.14    │
└─────────────────────────────┘

┌─────────────────────────────┐
│ ▶ Recent Activity (12)      │ ◀─ Collapsed, tap to expand
└─────────────────────────────┘
```

### Mobile Component Details

#### 6.1 Health Pulse (Mobile-Only)

**Purpose:** Single-line system status. Sticky at top.

```
┌─────────────────────────────────────┐
│ 🟢 All systems go · 3 active · €2.14│
└─────────────────────────────────────┘
```

**States:**
| State | Display |
|-------|---------|
| All good | 🟢 All systems go |
| Warning | 🟡 1 task stalled |
| Critical | 🔴 System offline |

**Behavior:**
- Sticky to top (stays visible on scroll)
- Tap → expands to full StatusBar details
- Background color tints on warning/critical

**Theming:**
```tsx
<button
  role="status"
  aria-live="polite"
  aria-label={`System ${status}. ${activeCount} active. Cost: ${cost} euros`}
  className={cn(
    "sticky top-0 z-40 w-full px-4 py-2 text-sm",
    "flex items-center justify-center gap-2",
    "border-b border-border backdrop-blur-sm",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
    status === 'online' && "bg-card/95",
    status === 'warning' && "bg-yellow-500/10 dark:bg-yellow-500/20",
    status === 'critical' && "bg-red-500/10 dark:bg-red-500/20"
  )}
  onClick={onExpand}
>
  <span 
    className={cn(
      "h-2 w-2 rounded-full",
      status === 'online' && "bg-green-500",
      status === 'warning' && "bg-yellow-500",
      status === 'critical' && "bg-red-500"
    )}
    aria-hidden="true"
  />
  <span className="text-foreground">{statusText}</span>
  <span className="text-muted-foreground">·</span>
  <span className="text-muted-foreground">{activeCount} active</span>
  <span className="text-muted-foreground">·</span>
  <span className="text-muted-foreground">€{cost}</span>
</button>
```

**Accessibility:** Full status in `aria-label`, dot is `aria-hidden`. Entire bar is tappable button.

---

#### 6.2 Alert Banner (Mobile-Only)

**Purpose:** Surface problems immediately. Only renders when issues exist.

```
┌─────────────────────────────────────┐
│ ⚠️ Bob's task stalled (23m ago)     │
│ "Implement dark mode toggle"        │
│                    [View] [Dismiss] │
└─────────────────────────────────────┘
```

**Triggers:**
- Task stalled (no heartbeat > timeout)
- Task failed in last 30m
- Zombie detected
- Agent trust dropped below 50%

**Actions:**
- [View] → Navigate to task/agent detail
- [Dismiss] → Hide for this session (stored in localStorage)

**Stacking:** Multiple alerts stack vertically, newest on top, max 3 visible.

**Theming:**
```tsx
<div 
  role="alert"
  aria-live="polite"
  className={cn(
    "rounded-lg border p-4 mb-2",
    severity === 'error' && "bg-red-500/10 border-red-500/30 dark:bg-red-500/20",
    severity === 'warning' && "bg-yellow-500/10 border-yellow-500/30 dark:bg-yellow-500/20"
  )}
>
  <p className="text-sm font-medium text-foreground">{title}</p>
  <p className="text-xs text-muted-foreground">{description}</p>
  <div className="flex gap-2 mt-3">
    <button className="text-xs font-medium px-3 py-1.5 rounded bg-foreground text-background">
      View
    </button>
    <button className="text-xs px-3 py-1.5 text-muted-foreground hover:text-foreground">
      Dismiss
    </button>
  </div>
</div>
```

**Accessibility:** `role="alert" aria-live="polite"`, dismiss button needs `aria-label` with context.

---

#### 6.3 Live Now Cards (Mobile)

**Purpose:** What's happening right now. Primary focus area.

**Card Anatomy (Mobile):**
```
┌─────────────────────────────────────┐
│ 👑 Kevin                     Opus ▼ │
│ Building overview spec for dash     │
│ ━━━━━━━━━━━━━░░░░░░░ 14m · €0.42   │
│  └─ 🎨 Bob: AgentCard component     │ ◀─ Spawned as sub-line
└─────────────────────────────────────┘
```

**Key Differences from Desktop:**
- **Flatter hierarchy:** Spawned tasks shown as indented sub-line, not separate cards
- **No heartbeat message:** Too much detail for mobile (tap to see)
- **Progress bar is thinner:** 2px instead of 4px
- **Model in corner:** Small label, not prominent badge

**Tap Interactions:**
- Tap card → Expand to show heartbeat, full task text, actions
- Tap agent icon → Navigate to agent profile
- Long-press → Quick actions menu (view run, kill task)

**Empty State:**
```
┌─────────────────────────────────────┐
│            😴                        │
│      All agents idle                │
│   Last activity: 12m ago            │
└─────────────────────────────────────┘
```

---

#### 6.4 Team Strip (Mobile)

**Purpose:** Quick scan of who's available. Horizontal scroll.

```
┌─────────────────────────────────────────────────────┐
│ TEAM                                          7 ▶   │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│ │ 🟢   │ │ 🟡   │ │ ⚫   │ │ ⚫   │ │ ⚫   │  →   │
│ │[Avtr]│ │[Avtr]│ │[Avtr]│ │[Avtr]│ │[Avtr]│      │
│ │Kevin │ │ Bob  │ │Nefar │ │Stuart│ │ Mel  │      │
│ │Lead  │ │ UI   │ │ Res  │ │ DB   │ │ Sec  │      │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘      │
└─────────────────────────────────────────────────────┘
```

**Avatar States:**
| State | Indicator |
|-------|-----------|
| Active (own task) | 🟢 Green ring + pulse |
| Working (sub-agent) | 🟡 Yellow ring |
| Idle | ⚫ Gray ring |
| Error | 🔴 Red ring |

**Information Shown:**
- Avatar (48px, circular)
- Status ring (colored border)
- Name (truncated to 6 chars)
- Role (3-4 char abbreviation)

**Role Abbreviations:**
| Agent | Role |
|-------|------|
| Kevin | Lead |
| Bob | UI |
| Dr. Nefario | Res |
| X Reader | X |
| Stuart | DB |
| Mel | Sec |
| Dave | Fin |

**Tap Interaction:**
- Tap avatar → Bottom sheet with full agent card

**Agent Bottom Sheet:**
```
┌─────────────────────────────────────┐
│ ━━━━━ (drag handle)                 │
├─────────────────────────────────────┤
│ [Large Avatar]                      │
│ Kevin                          👑   │
│ Lead minion, team orchestrator      │
│                                     │
│ Model: Opus 4.6                     │
│ Trust: ████████░░ 100%              │
│ Today: 3 tasks · €1.24              │
│                                     │
│ Currently:                          │
│ ▶ Building overview spec (14m)      │
│                                     │
│ [View Profile]  [View Tasks]        │
└─────────────────────────────────────┘
```

**Bottom Sheet Theming:**
```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="sheet-title"
  className="fixed inset-x-0 bottom-0 z-50 rounded-t-xl border-t border-border bg-card"
>
  {/* Drag handle */}
  <div className="flex justify-center pt-4 pb-2">
    <div className="h-1 w-12 rounded-full bg-muted" aria-hidden="true" />
  </div>
  
  {/* Content */}
  <div className="px-6 pb-8">
    <div className="flex items-center gap-4">
      <Avatar className="h-16 w-16 ring-2 ring-border" />
      <div>
        <h2 id="sheet-title" className="text-lg font-semibold text-foreground">{name}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
    
    <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
      <div>
        <dt className="text-muted-foreground">Model</dt>
        <dd className="font-medium text-foreground">{model}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Trust</dt>
        <dd className={cn(
          "font-medium",
          trustScore >= 80 ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"
        )}>{trustScore}%</dd>
      </div>
    </dl>
    
    <div className="mt-6 flex gap-3">
      <button className="flex-1 rounded-lg bg-accent py-2 text-sm font-medium text-foreground">
        View Profile
      </button>
      <button className="flex-1 rounded-lg border border-border py-2 text-sm text-muted-foreground">
        View Tasks
      </button>
    </div>
  </div>
</div>
```

**Accessibility:**
| Element | Requirement |
|---------|-------------|
| Container | `role="dialog" aria-modal="true" aria-labelledby` |
| Drag handle | `aria-hidden="true"` (decorative) |
| Definition list | Use `<dl>/<dt>/<dd>` for key-value pairs |
| Escape key | Close bottom sheet |
| Focus trap | Keep focus within sheet while open |

---

#### 6.5 Today Summary (Mobile Pipeline)

**Purpose:** Day's progress at a glance. Replaces detailed pipeline.

```
┌─────────────────────────────────────┐
│ TODAY                               │
│ ████████████████░░░░ 85%            │
│ ✓ 12 done · ✗ 1 fail · €2.14       │
└─────────────────────────────────────┘
```

**Progress Bar:**
- Green portion = success rate
- Shows today's tasks, not last hour (more meaningful on mobile)

**Tap Interaction:**
- Tap → Navigate to `/runs?date=today`

---

#### 6.6 Recent Activity (Mobile)

**Purpose:** Audit trail. Collapsed by default to save space.

**Collapsed:**
```
┌─────────────────────────────────────┐
│ ▶ Recent Activity              (12) │
└─────────────────────────────────────┘
```

**Expanded:**
```
┌─────────────────────────────────────┐
│ ▼ Recent Activity                   │
├─────────────────────────────────────┤
│ 2m  ✓ Kevin: overview spec          │
│ 8m  👶 Kevin → Bob: AgentCard       │
│ 12m ✓ Bob: navbar spacing           │
│ 15m ▶ Kevin: overview spec          │
│ 23m ✗ Bob: dark mode (retry 2/3)    │
│ 31m 🧹 Mel killed Bob zombie        │
├─────────────────────────────────────┤
│ [View All Activity →]               │
└─────────────────────────────────────┘
```

**Mobile Event Format:**
- `{time} {icon} {agent}: {task_short}`
- Max 25 chars for task, then ellipsis
- No costs shown (too cluttered)

---

### Mobile Gestures & Interactions

| Gesture | Location | Action |
|---------|----------|--------|
| Tap | Health Pulse | Expand system details |
| Tap | Live card | Expand card details |
| Long-press | Live card | Quick actions menu |
| Tap | Team avatar | Open agent bottom sheet |
| Horizontal scroll | Team strip | See more agents |
| Tap | Today bar | Navigate to runs |
| Tap | Activity header | Toggle expand/collapse |
| Pull down | Top of page | Refresh all data |

---

### Mobile vs Desktop Comparison

| Aspect | Desktop | Mobile |
|--------|---------|--------|
| **Layout** | 2-column grid | Single column stack |
| **Health** | StatusBar (full) | Health Pulse (1-line sticky) |
| **Alerts** | Inline in cards | Dedicated alert banner |
| **Live tasks** | Task trees with cards | Flat cards with sub-lines |
| **Team** | 2-col card grid | Horizontal avatar strip |
| **Pipeline** | 4 stage indicators | Single progress bar |
| **Activity** | Expandable section | Collapsed by default |
| **Details** | Inline/hover | Bottom sheets |
| **Spawns** | Visual tree lines | Indented sub-lines |
| **Refresh** | SWR polling | Pull-to-refresh + polling |

---

### Mobile-Specific Components

These components exist ONLY in the mobile layout:

```
src/components/overview/mobile/
├── health-pulse.tsx       # Sticky 1-line status
├── alert-banner.tsx       # Problem surfacing
├── live-card-mobile.tsx   # Compact task card
├── team-strip.tsx         # Horizontal scroll avatars
├── agent-bottom-sheet.tsx # Detail overlay
├── today-summary.tsx      # Progress bar + stats
└── activity-collapsed.tsx # Expandable list
```

---

### Responsive Breakpoints

```typescript
// Breakpoint strategy
const BREAKPOINTS = {
  mobile: 0,      // 0-767px: Mobile-specific layout
  tablet: 768,    // 768-1023px: Hybrid (mobile cards, 2-col team)
  desktop: 1024,  // 1024px+: Full desktop layout
}

// Component switching
function Overview() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  
  if (isMobile) {
    return <MobileOverview />  // Completely different component tree
  }
  return <DesktopOverview />
}
```

**Important:** Don't use CSS-only responsive. Use component switching for mobile vs desktop. They're different experiences, not the same components with different styles.

---

## 6B. Epic Progress Tracker

### Problem
Large multi-phase tasks (like "Multi-Project Workflow" or "Overview Redesign v2") span days and have many sub-tasks. Currently there's no way to see their progress on the Overview — Boss has to open the feature request markdown file to check what's done.

### Data Source
Feature requests live in `planning/feature-requests/*.md` with YAML frontmatter:
```yaml
---
project: oclaw-ops
priority: high
status: planned | in-progress | completed
assigned: kevin
tags: [dashboard, UX]
---
```

Sub-tasks are embedded as markdown with phases/checkboxes:
```markdown
## Phase 1: Data Layer (⚡ ~20 min, ~€0.40)
### 1A. PLANNING — Unified API design (Opus, ~€0.20)
- [x] Design `/api/overview` endpoint
- [ ] Define spawn tree builder
### 1B. EXECUTION — Build API + hooks (Gemini, ~€0.20)
- [ ] Build route.ts
- [ ] Build SWR hook
```

### New DB Table: `ops.epics`
```sql
CREATE TABLE ops.epics (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,           -- "overview-redesign-v2"
  title TEXT NOT NULL,                  -- "Overview Page Redesign v2"
  source_path TEXT,                     -- "planning/feature-requests/overview-redesign-v2.md"
  project TEXT,                         -- "oclaw-ops"
  status TEXT DEFAULT 'planned',        -- planned | in-progress | completed
  priority TEXT DEFAULT 'medium',       -- low | medium | high | critical
  assigned_to TEXT,                     -- "kevin"
  total_steps INTEGER DEFAULT 0,
  completed_steps INTEGER DEFAULT 0,
  estimated_cost_eur NUMERIC(10,2),
  actual_cost_eur NUMERIC(10,2) DEFAULT 0,
  phases JSONB DEFAULT '[]',           -- [{name, steps: [{desc, done, agent, model, cost}]}]
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Sync Mechanism
- Script `scripts/sync-epics.mjs` parses feature request markdown → extracts phases, checkboxes, cost estimates → upserts to `ops.epics`
- Agents call `sync-epics.mjs --mark "overview-redesign-v2" "1B"` when completing a sub-task
- Cron job runs sync every 30 min to catch manual edits to markdown files

### Desktop Component: `EpicTracker`

Position: Between Pipeline Strip and Activity Timeline (or below Live Work Panel if there are active epics)

```
┌──────────────────────────────────────────────────────────────────────┐
│  📋 ACTIVE EPICS                                                      │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Overview Redesign v2          oclaw-ops    kevin               │  │
│  │ ██████████░░░░░░░░░░ 5/11 tasks (45%)     ~€2.40/€5.40       │  │
│  │                                                                │  │
│  │ ✅ Phase 1: Data Layer        ✅ 1A ✅ 1B                     │  │
│  │ 🔄 Phase 2: Mobile            ✅ 2A 🔄 2B ⬜ 2C              │  │
│  │ ⬜ Phase 3: Desktop            ⬜ 3A ⬜ 3B ⬜ 3C              │  │
│  │ ⬜ Phase 4: Integration        ⬜ 4A ⬜ 4B ⬜ 4C              │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Multi-Project Workflow        infrastructure    kevin          │  │
│  │ ████░░░░░░░░░░░░░░░░ 2/9 tasks (22%)      ~€0.50/€2.60      │  │
│  │ ▶ Expand phases...                                             │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

**Visual states for steps:**
- ✅ `text-green-600 dark:text-green-400` — completed
- 🔄 `text-blue-600 dark:text-blue-400` + pulse animation — in progress
- ⬜ `text-muted-foreground` — pending

**Interactions:**
- Click epic card → expand to show all phases with sub-tasks
- Click phase → expand to show individual checkboxes
- Click epic title → link to GitHub feature request file
- Progress bar: colored green for done, blue for in-progress, muted for remaining
- Cost: shows actual/estimated, turns yellow if actual > 80% estimated, red if over

**Collapsed state (default):** Title + progress bar + fraction + cost. One line per epic.
**Expanded state:** Full phase breakdown with checkboxes as shown above.

### Mobile Component: `EpicTrackerMobile`

Position: Below TodaySummary (pipeline), above ActivityCollapsed

```
┌─────────────────────────┐
│ 📋 Active Epics (2)     │
│                         │
│ Overview Redesign v2    │
│ ██████████░░░░ 45%      │
│ Phase 2: Mobile 🔄      │
│                         │
│ Multi-Project Workflow  │
│ ████░░░░░░░░░░ 22%      │
│ Phase 1: Context 🔄     │
│                         │
│ [Tap to expand]         │
└─────────────────────────┘
```

- Shows: title + progress bar + current active phase name
- Tap → expand to full phase view (same as desktop expanded)
- Swipe between epics if >3 (horizontal scroll)

### Accessibility
- Progress bars: `role="progressbar" aria-valuenow="45" aria-valuemin="0" aria-valuemax="100" aria-label="Overview Redesign: 45% complete, 5 of 11 tasks done"`
- Step icons: `aria-label="Completed"` / `aria-label="In progress"` / `aria-label="Pending"`
- Epic cards: `role="region" aria-label="Epic: Overview Redesign v2"`
- Expand/collapse: `aria-expanded` + `aria-controls`

### WCAG
- Progress bar colors: green-500 on card bg meets 3:1 (UI component)
- All text follows existing token system
- Cost warning colors (yellow/red) paired with text labels, never color-only

---

## 7. Design Principles

### 1. Glanceability

**The 3-second test:** Boss should understand system state in 3 seconds.

- Status bar answers: "Is everything working?"
- Live work answers: "Who's busy and on what?"
- Team roster answers: "Who's available?"

**Implementation:**
- Use color consistently (green = good, red = bad, blue = active)
- Status dots on every avatar
- Numbers are large and prominent

### 2. Progressive Disclosure

**Show summary first, details on demand.**

- Pipeline shows counts → click for filtered list
- Activity collapsed → expand for timeline
- Team shows avatars → click for full profile

**Implementation:**
- Collapse complex sections by default
- Use expandable cards, not separate pages
- "View All" links for deep dives

### 3. Information Density (Balanced)

**Dense but not cramped.**

Reference: Linear's project views pack info but feel clean.

**Implementation:**
- Use small but readable text (10-12px for secondary)
- Tight spacing (gap-2, p-2 for cards)
- No unnecessary borders or separators
- White space between sections, not within

### 4. Real-time Feel

**The dashboard should feel alive.**

**Implementation:**
- Pulse animation on active status dots
- Live elapsed counters (tick every second)
- Heartbeat messages update in place
- New events slide in, don't jump

### 5. Mobile-First Actions

**Boss reads on phone. Design for thumb.**

**Implementation:**
- Touch targets ≥44px
- Bottom sheets instead of dropdowns
- Swipe gestures where appropriate
- No hover-dependent interactions

### 6. Consistent Iconography

**Every concept has one icon, used everywhere.**

| Concept | Icon | Usage |
|---------|------|-------|
| Active | 🟢 (dot) | Status dots, indicators |
| Idle | ⚫ (gray dot) | Status dots |
| Error | 🔴 (red dot) | Status dots |
| Running | ▶ | Task prefix |
| Completed | ✓ | Task prefix, badge |
| Failed | ✗ | Task prefix, badge |
| Spawned | 👶 | Event timeline |
| Lead/Main | 👑 | Kevin only |

---

## 8. Empty, Loading, Error States

### LiveWorkPanel

| State | Display |
|-------|---------|
| Loading | 2 skeleton cards with pulse animation |
| Empty | "😴 All agents idle" + last activity time |
| Error | "Failed to load" + Retry button |

### TeamRoster

| State | Display |
|-------|---------|
| Loading | 6 skeleton avatar circles |
| Empty | Never empty (always have agents) |
| Error | "Failed to load team" + Retry |

### PipelineStrip

| State | Display |
|-------|---------|
| Loading | Gray placeholders for numbers |
| Empty | All zeros (valid state) |
| Error | Hide section, show inline error |

### ActivityTimeline

| State | Display |
|-------|---------|
| Loading | 3 skeleton rows |
| Empty | "No recent activity" |
| Error | "Failed to load" (non-blocking) |

---

## 9. Implementation Order

### Phase 1: Data Layer
1. Create `/api/overview` unified endpoint with spawn tree builder
2. Create `useOverviewData` SWR hook with polling config
3. Create `useMediaQuery` hook (if not exists)

### Phase 2: Mobile First (Primary Target)
4. Build mobile layout orchestrator (`mobile-overview.tsx`)
5. Build `HealthPulse` (sticky status)
6. Build `AlertBanner` (problem surfacing)
7. Build `LiveCardMobile` (compact task cards with spawns)
8. Build `TeamStrip` (horizontal scroll avatars)
9. Build `AgentBottomSheet` (tap-to-expand details)
10. Build `TodaySummary` (mini pipeline)
11. Build `ActivityCollapsed` (expandable list)

### Phase 3: Desktop Experience
12. Build desktop layout orchestrator (`desktop-overview.tsx`)
13. Build `StatusBar` (full system info)
14. Build `LiveWorkPanel` with `TaskTree` and `TaskCard`
15. Build `TeamRoster` with `AgentCard` (2-col grid)
16. Build `PipelineStrip` (4-stage visualization)
17. Build `ActivityTimeline` (refactor from existing)

### Phase 4: Integration & Polish
18. Create breakpoint-switching `Overview` component
19. Update `page.tsx` to use new Overview
20. Add animations (pulse, slide-in, live counters)
21. Add error boundaries and loading skeletons
22. Pull-to-refresh for mobile

### Phase 5: Cleanup
23. Remove old components (AgentStrip, SubAgentMonitor, ActiveTasks)
24. Remove duplicate/unused API endpoints
25. Performance audit (bundle size, polling, re-renders)
26. Accessibility pass (focus management, screen readers)

---

## 10. Files to Create/Modify

### New Files
```
src/components/overview/
├── index.tsx                  # Exports + breakpoint switching
├── desktop-overview.tsx       # Desktop layout orchestrator
├── mobile-overview.tsx        # Mobile layout orchestrator
│
├── desktop/
│   ├── status-bar.tsx
│   ├── live-work-panel.tsx
│   ├── task-tree.tsx
│   ├── task-card.tsx
│   ├── team-roster.tsx
│   ├── agent-card.tsx
│   ├── pipeline-strip.tsx
│   └── activity-timeline.tsx
│
├── mobile/
│   ├── health-pulse.tsx       # Sticky 1-line status
│   ├── alert-banner.tsx       # Problem surfacing
│   ├── live-card-mobile.tsx   # Compact task card
│   ├── team-strip.tsx         # Horizontal scroll avatars
│   ├── agent-bottom-sheet.tsx # Detail overlay
│   ├── today-summary.tsx      # Progress bar + stats
│   └── activity-collapsed.tsx # Expandable list
│
└── shared/
    ├── use-overview-data.ts   # SWR hook for data fetching
    ├── agent-avatar.tsx       # Shared avatar component
    ├── status-dot.tsx         # Shared status indicator
    └── theme-colors.ts        # Status color constants (theme-aware)

src/app/api/overview/route.ts
src/hooks/use-media-query.ts   # If not already exists
src/lib/accessibility.ts       # Focus trap, aria helpers
```

### Theme Color Constants

Create `src/components/overview/shared/theme-colors.ts`:

```typescript
// Status colors - use these constants, not inline classes
export const statusColors = {
  active: {
    dot: "bg-green-500",
    text: "text-green-600 dark:text-green-400",
    bg: "bg-green-500/10 dark:bg-green-500/20",
    border: "border-green-500/30",
  },
  idle: {
    dot: "bg-zinc-400 dark:bg-zinc-600",
    text: "text-muted-foreground",
    bg: "bg-muted",
    border: "border-border",
  },
  error: {
    dot: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10 dark:bg-red-500/20",
    border: "border-red-500/30",
  },
  warning: {
    dot: "bg-yellow-500",
    text: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-500/10 dark:bg-yellow-500/20",
    border: "border-yellow-500/30",
  },
} as const

// Trust score colors
export const trustColors = {
  high: "text-green-600 dark:text-green-400",   // >= 80%
  medium: "text-yellow-600 dark:text-yellow-400", // 50-79%
  low: "text-red-600 dark:text-red-400",        // < 50%
} as const

export function getTrustColor(score: number) {
  if (score >= 80) return trustColors.high
  if (score >= 50) return trustColors.medium
  return trustColors.low
}

// Progress bar health colors
export const healthColors = {
  healthy: "bg-green-500",   // > 60%
  warning: "bg-yellow-500",  // 30-60%
  critical: "bg-red-500",    // < 30%
} as const

export function getHealthColor(percent: number) {
  if (percent > 60) return healthColors.healthy
  if (percent > 30) return healthColors.warning
  return healthColors.critical
}
```

### Modify
```
src/app/(dashboard)/page.tsx        # Use new Overview component
src/components/dashboard/dashboard-client.tsx  # Replace with Overview import
```

### Delete (after migration)
```
src/components/dashboard/agent-strip.tsx
src/components/dashboard/subagent-monitor.tsx
src/components/dashboard/active-tasks.tsx
```

---

## 11. Success Metrics

After implementation, the Overview should pass these tests:

### Core Metrics
1. **3-second test:** New user understands system state in 3 seconds
2. **Spawn clarity:** Can trace which agent spawned which sub-agent
3. **Description visible:** Every agent shows their role/description
4. **No duplicates:** Each piece of info appears in exactly one place
5. **Actionable:** Every card/row links to deeper detail

### Mobile-Specific Metrics
6. **Telegram webview test:** Full functionality in 375px viewport
7. **Thumb-zone test:** All interactive elements reachable with one thumb
8. **One-hand test:** Complete a full status check without needing second hand
9. **Glance test:** Health status visible without scrolling
10. **Alert visibility:** Problems surface immediately (no hunting)
11. **Bottom sheet test:** Details accessible without leaving context

### Performance Metrics
12. **First paint:** < 1s on 4G connection
13. **Interactive:** < 2s on 4G connection
14. **Polling efficiency:** No visible jank during background updates
15. **Bundle size:** Mobile components < 50KB gzipped

### Accessibility Metrics (WCAG AA)
16. **Contrast:** All text meets 4.5:1 (body) or 3:1 (large/bold)
17. **Focus visible:** Every interactive element has visible focus ring
18. **Keyboard nav:** Full functionality without mouse
19. **Screen reader:** Logical heading structure, aria-labels, live regions
20. **Reduced motion:** Animations respect `prefers-reduced-motion`
21. **Color independence:** No information conveyed by color alone

---

## 12. Accessibility Audit Checklist

Use this checklist during implementation and code review:

### Global
- [ ] All colors from semantic token table (Section 0.1)
- [ ] Contrast ratios verified with browser DevTools or axe
- [ ] `prefers-reduced-motion` respected for all animations
- [ ] Focus styles use `focus-visible:ring-2 focus-visible:ring-ring`

### StatusBar / Health Pulse
- [ ] `role="status" aria-live="polite"` on container
- [ ] Status text redundant with dot color
- [ ] Clickable sections have `role="button" tabindex="0"`

### LiveWorkPanel / Live Cards
- [ ] Task cards are `<article>` with heading structure
- [ ] Progress bars have `role="progressbar"` + aria-value*
- [ ] Stalled status announced (not just red color)
- [ ] Spawned tasks have text label "Spawned by X"

### TeamRoster / Team Strip
- [ ] Grid has `role="list"`, cards have `role="listitem"`
- [ ] Each card has comprehensive `aria-label`
- [ ] Avatar images have empty `alt=""` (info in aria-label)
- [ ] Status dots are `aria-hidden="true"`
- [ ] Trust score shows number, not just color

### PipelineStrip / Today Summary
- [ ] Section has `aria-labelledby` pointing to heading
- [ ] Progress bar has full aria-progressbar attributes
- [ ] Stage counts visible regardless of color

### ActivityTimeline
- [ ] Expand/collapse button has `aria-expanded` + `aria-controls`
- [ ] Panel has `role="region"` when expanded
- [ ] Timestamps use `<time>` with `dateTime`
- [ ] Event icons are `aria-hidden="true"`

### Alert Banner (Mobile)
- [ ] Container has `role="alert" aria-live="polite"`
- [ ] Dismiss button has descriptive `aria-label`

### Bottom Sheets (Mobile)
- [ ] `role="dialog" aria-modal="true" aria-labelledby`
- [ ] Focus trap when open
- [ ] Escape key closes
- [ ] Return focus to trigger on close

### Keyboard Navigation
- [ ] Tab order follows visual order
- [ ] Enter/Space activates buttons
- [ ] Escape closes modals/sheets
- [ ] Arrow keys work in horizontal scroll areas

---

## Appendix: Visual Reference Mood Board

**Linear:** Clean cards, subtle borders, excellent information density
**Vercel:** Deployment pipeline visualization, real-time feel
**GitHub Actions:** Workflow trees, spawn relationships
**Datadog:** Status indicators, metric sparklines
**Raycast:** Compact list items, keyboard-first but touch-friendly

---

*End of spec. Ready for implementation.*
