# SPEC: Dashboard Improvements

## Overview
This spec outlines enhancements to the Mission Control Dashboard (`oclaw-ops/dashboard/`) based on feedback from Boss on 2026-02-11. Each item addresses usability, clarity, and functionality issues on the `/` (Overview) and `/agents/[id]` pages.

## 1. Runs Card Clarity

### Issue
- Card title "Active Runs" (or similar) is not explicit. Users unfamiliar with the term "runs" (workflow executions or agent tasks) may not understand its purpose.
- Question on relevance: Should it remain a prominent KPI card?

### Proposed Solution
- **Rename and Clarify:** Update card title to "Active Workflows" or "Running Tasks".
- **Add Subtitle or Tooltip:** Include a small subtitle or hover tooltip: "Background tasks or workflows currently executing."
- **Relevance Decision:** Keep as a card for now (it’s a key operational metric), but reduce its visual priority (move below other KPIs or make smaller) if Boss confirms it’s less critical.

### Implementation
- Update `src/components/dashboard/kpi-cards.tsx` (or wherever the card is defined).
- Add tooltip component via shadcn/ui if not already present.

### Priority
Low — Minor UX tweak, no functional impact.

## 2. Recent Activity Content

### Issue
- "Recent Activity" feed on the Overview page lacks detail. Entries are vague, not conveying actionable info (e.g., no context on what was done or results).

### Proposed Solution
- **Enhance Detail:** Format entries as "[Agent] worked on [Topic/Task] for [Duration], [Result Summary]" when possible.
  - Example: "Kevin worked on Cost Card Spec for 45s, spec written to COST-CARD.md"
  - Fallback: "[Agent] completed a task at [Time]" if no summary is available.
- **Data Source:** Pull from `ops.agent_events` or session logs in Postgres (`openclaw_db`).
- **Alternative:** If detailed parsing is complex, remove the feed entirely to avoid clutter.

### Implementation
- Update `src/components/dashboard/activity-feed.tsx`.
- Add a query to fetch richer event data if current table lacks fields (may need schema update).
- Add toggle in UI or config to disable feed if Boss prefers removal.

### Edge Cases
- **No Data:** Show "No recent activity" placeholder.
- **Truncation:** Limit result summary to 50 chars to avoid overflow on mobile.

### Priority
Medium — Improves usability, requires moderate data work.

## 3. Mugshots for Minions (Avatars)

### Issue
- Agent avatars currently use initials (e.g., "K" for Kevin) instead of distinct images.

### Proposed Solution
- **Replace with Mugshots:** Use the provided Minion avatar images for agent cards and detail pages.
- **Storage:** Images are already available at `~/.openclaw/workspace/assets/minion-avatars/` (e.g., `kevin.webp`, `nefario.webp`, `bob.webp`).
  - Copy these to `public/assets/minion-avatars/` in the dashboard project for web access.
- **Fallback:** Use emoji from agent identity (e.g., 🍌 for Kevin) as avatar if no image is available for an agent.

### Implementation
- Copy avatar files from `~/.openclaw/workspace/assets/minion-avatars/` to `public/assets/minion-avatars/` in the dashboard repo.
- Update `src/components/dashboard/agent-strip.tsx` and any agent list/detail components (e.g., `/agents/[id]/page.tsx`).
- Replace initial/emojis with `<img>` tags pointing to `/assets/minion-avatars/[agentId].webp`.
- Add fallback logic: if image fails to load, show emoji or initial.

### Priority
Medium — Images are ready, enhances visual identity of Minions Control.

## 4. Agent Trust Score Display

### Issue
- Trust score on agent detail page (`/agents/[id]`) shows raw decimal (e.g., 72.345) without rounding.
- No explanation of levels, calculation, or benefits of higher trust.

### Proposed Solution
- **Round to Percent:** Display as nearest integer percent (e.g., 72%).
- **Add Tooltip:** Include hover tooltip or expandable section:
  - **Levels:** L1 👁️ (0-25%, Observer), L2 💡 (26-50%, Contributor), L3 ⚙️ (51-75%, Operator), L4 🚀 (76-100%, Autonomous)
  - **Calculation:** "Based on task success rate, error frequency, and manual overrides over last 30 days."
  - **Benefits:** "Higher levels unlock more autonomy: L1 (read-only), L2 (suggest actions), L3 (execute with approval), L4 (act independently)."
- **Visual Indicator:** Add badge or icon next to score reflecting level (e.g., ⚙️ for L3).

### Implementation
- Update `src/app/agents/[id]/page.tsx` or related component.
- Use shadcn/ui `<Tooltip>` for hover content.
- Ensure trust score in database (`ops.agents` or similar) is formatted before render.

### Priority
Medium — Improves trust system transparency, minor UI work.

## 5. Tasks Completed Counter

### Issue
- "Tasks Completed Today" card stuck at zero despite agent activity (e.g., Kevin’s spec writing, debugging).
- Likely a counter error or missing event tracking.

### Proposed Solution
- **Fix Counter:** Ensure it increments on task completion events (e.g., session_spawn completion, spec file writes, user-acknowledged results).
- **Data Source:** Check `ops.agent_events` or `ops.tasks` for completion records. If missing, update event logging in OpenClaw cron or session end.
- **Scope:** Count only tasks completed in current UTC day (reset at 00:00 UTC).

### Implementation
- Debug `src/components/dashboard/kpi-cards.tsx` or wherever counter is computed.
- Verify query: Likely `SELECT COUNT(*) FROM ops.tasks WHERE completed_at >= date_trunc('day', now())` or similar.
- If no table tracks tasks, propose lightweight schema addition (id, agent_id, completed_at, summary).

### Edge Cases
- **No Tasks:** Display "0" with muted text "No tasks today".
- **Double-Counting:** Ensure one task = one increment (avoid counting sub-steps).

### Priority
High — Broken metric, misrepresents agent value.

## Next Steps
- Assign Bob 🎨 (vibe coder) to implement UI changes (1, 2, 3, 4) once specs are approved.
- Kevin 🍌 to investigate and fix Tasks Completed counter (5) immediately as it’s a functional bug.
- Review with Boss on "Runs" card relevance and "Recent Activity" keep/remove decision.
