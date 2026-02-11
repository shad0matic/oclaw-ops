# SPEC: Non-Fixed Costs Card

## Overview
A dashboard card that appears on the Overview page (`/`) when non-fixed costs exceed €0 in the current 30-day window. Shows cumulative spend trend with color-coded pulsating glow indicating burn severity.

## Trigger
- **Visible when:** sum of non-fixed costs over last 30 days > €0
- **Hidden when:** no non-fixed costs recorded (don't show an empty card)

## Layout

### Card Header
- Title: **"Variable Costs"** (or "API Burn" — pick what feels right)
- Right-aligned: **€XX.XX** cumulative 30-day total, bold
- Subtitle: "Last 30 days" in muted text

### Chart Area
- **Type:** Area chart (cumulative line with filled area underneath)
- **X-axis:** Days (last 30), show date labels every 5 days
- **Y-axis:** Cumulative € amount
- **Line:** Smooth (monotone curve), 2px stroke
- **Fill:** Gradient from line color to transparent
- **Tooltip on hover:** Date + daily spend + cumulative total
- **Library:** Recharts `<AreaChart>` with `<Tooltip>`

### Projected Month-End
- Below chart, small text: **"Projected: ~€XX by month end"**
- Calculation: `(cumulative / days_elapsed) * 30`
- Color matches current glow tier

### Toggle (optional, nice-to-have)
- Small toggle or tabs: **Cumulative** | **Daily**
- Daily view: bar chart showing per-day spend
- Default: Cumulative

## Pulsating Glow

### Thresholds (30-day cumulative total)
| Range | Color | CSS |
|-------|-------|-----|
| ≤ €10 | 🟢 Green | `#22c55e` (green-500) |
| €11 – €100 | 🟠 Orange | `#f97316` (orange-500) |
| > €100 | 🔴 Red | `#ef4444` (red-500) |

### Animation
```css
@keyframes cost-pulse {
  0%, 100% { box-shadow: 0 0 8px 2px var(--glow-color); }
  50% { box-shadow: 0 0 20px 6px var(--glow-color); }
}

.cost-card {
  animation: cost-pulse 2s ease-in-out infinite;
  border: 1px solid var(--glow-color);
  border-radius: 12px;
}
```

- Pulse speed: **2s** for green, **1.5s** for orange, **1s** for red (faster = more urgent)
- Glow opacity: 40% at rest, 80% at peak

## Data Source

### Postgres Query
```sql
SELECT
  date_trunc('day', recorded_at) AS day,
  SUM(non_fixed_cost_eur) AS daily_cost
FROM ops.cost_snapshots
WHERE recorded_at >= NOW() - INTERVAL '30 days'
  AND non_fixed_cost_eur > 0
GROUP BY day
ORDER BY day;
```

- **Table:** `ops.cost_snapshots` (populated by hourly cron)
- **Field:** `non_fixed_cost_eur` — API calls, token costs, anything not subscription-based
- If this field doesn't exist yet, derive from: `total_cost - fixed_cost` or add it to the schema

### API Route
- `GET /api/costs/variable?days=30`
- Returns: `{ total: number, daily: [{date, cost, cumulative}], projected: number, tier: "green"|"orange"|"red" }`

## Component Structure
```
src/components/cards/
  VariableCostCard.tsx    — main card component
  CostAreaChart.tsx       — recharts area chart
  CostGlow.tsx            — glow wrapper (takes tier prop)
```

## Responsive
- **Desktop:** Standard card width (same as other KPI cards)
- **Mobile:** Full width, chart height reduces to 120px
- Touch-friendly tooltip (tap instead of hover)

## Edge Cases
- **No data:** Card hidden entirely
- **< 3 days of data:** Show bar chart instead of area (too few points for meaningful curve)
- **Exactly €0:** Card hidden
- **Currency:** Always EUR (€), 2 decimal places

## Priority
Medium — nice visual enhancement, builds on existing cost-tracker infrastructure.
