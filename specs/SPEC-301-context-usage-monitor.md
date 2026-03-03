# SPEC-301: Add Context Usage % to Dashboard System Monitor

**Task ID:** #301  
**Title:** Add Context Usage % to Dashboard System Monitor  
**Complexity:** easy  
**Project:** oclaw-ops  
**Created:** 2026-03-03

---

## Overview

Add a real-time context usage percentage indicator to the System Monitor component in Mission Control dashboard. This will show how much of the current session's context window is being used.

## Current State

System Monitor currently displays:
- CPU usage (%)
- RAM usage (MB)
- Disk usage (GB)

Located at: `dashboard/src/components/dashboard/system-monitor.tsx`

## Requirements

### 1. Data Source

Add a new endpoint or extend existing `/api/system` to include context usage:

```typescript
{
  cpu: { usage: number },
  ram: { used: number, total: number },
  disk: { used: number, total: number },
  context: {
    used: number,        // tokens used in current session
    total: number,       // total context window (e.g., 200k)
    percentage: number   // calculated usage %
  }
}
```

**Data collection:**
- Query OpenClaw Gateway API for current session context stats
- Use session status endpoint or similar
- Fallback to 0% if data unavailable

### 2. UI Component

Add context usage display to SystemMonitor component:

**Layout:** Add as 4th gauge alongside CPU/RAM/Disk

**Visual specs:**
- Same card style as existing gauges
- Progress bar or circular gauge (match existing style)
- Color coding:
  - 0-50%: green
  - 50-75%: yellow/amber
  - 75-90%: orange
  - 90-100%: red
- Display both percentage and absolute values (e.g., "40k / 200k tokens")

**Label:** "Context Usage" or "Session Context"

### 3. Refresh Rate

- Poll every 5-10 seconds (same as CPU/RAM/Disk)
- Use existing polling mechanism in SystemMonitor
- Handle API errors gracefully (show "N/A" if unavailable)

## Technical Implementation

### Files to modify:

1. **API Route** (`src/app/api/system/route.ts`):
   - Add context stats fetching
   - Query OpenClaw session status
   - Calculate percentage

2. **System Monitor Component** (`src/components/dashboard/system-monitor.tsx`):
   - Add context data to interface
   - Add 4th gauge component
   - Wire up data refresh

3. **System Stats Library** (`src/lib/system-stats.ts` if exists):
   - Add context usage calculation helper

### Data Flow:

```
OpenClaw Gateway → /api/system → SystemMonitor component → UI
```

## Acceptance Criteria

- [ ] Context usage % displayed in System Monitor
- [ ] Updates every 5-10 seconds
- [ ] Shows both percentage and token counts
- [ ] Color-coded based on thresholds
- [ ] Gracefully handles missing data
- [ ] Matches existing gauge styling
- [ ] Mobile responsive

## Notes

- Consider caching context stats to avoid hammering OpenClaw API
- May need to add authentication to query session stats
- If multiple sessions exist, show stats for "main" session or current user's session

## References

- System Monitor component: `dashboard/src/components/dashboard/system-monitor.tsx`
- OpenClaw session status: `openclaw status` CLI command
- Context tracking: Check Gateway API for session context endpoints
