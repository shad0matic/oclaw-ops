# SPEC: Light Mode Migration — Grunt Work

## Goal
Migrate all custom dashboard components from hardcoded dark-theme Tailwind classes to theme-aware classes so light/dark mode toggle works properly. The CSS variables in `globals.css` are already set up for both themes.

## Mapping Table

Replace these patterns throughout ALL files listed below:

| Hardcoded Dark | Theme-Aware Replacement |
|---|---|
| `bg-zinc-900/50` | `bg-card/50` |
| `bg-zinc-900` | `bg-card` |
| `bg-zinc-950` | `bg-background` |
| `bg-zinc-950/50` | `bg-background/50` |
| `bg-zinc-800` | `bg-muted` |
| `bg-zinc-800/50` | `bg-muted/50` |
| `bg-zinc-800/40` | `bg-muted/40` |
| `bg-zinc-800/60` | `bg-muted/60` |
| `border-zinc-800` | `border-border` |
| `border-zinc-700` | `border-border` |
| `text-white` | `text-foreground` |
| `text-zinc-300` | `text-foreground/80` |
| `text-zinc-400` | `text-muted-foreground` |
| `text-zinc-500` | `text-muted-foreground/70` |
| `text-zinc-600` | `text-muted-foreground/50` |
| `text-zinc-100` | `text-foreground/90` |
| `border-zinc-900` (status dots border) | `border-background` |

### Do NOT change:
- Status colors: `bg-green-500`, `text-green-400`, `bg-red-500`, `text-red-400`, `bg-amber-*`, `text-amber-*`, `bg-blue-*`, `text-blue-*` — these are semantic and stay the same
- Opacity modifiers on status colors (like `bg-green-500/10`) — keep as-is
- The gold title color `#FFD700` — keep as-is
- Gradient stops in charts — keep as-is
- `backdrop-blur-sm` — keep as-is
- Anything inside `globals.css` — don't touch

## Files to Migrate (ALL of these)

1. `src/components/dashboard/active-tasks.tsx`
2. `src/components/dashboard/activity-feed.tsx`
3. `src/components/dashboard/agent-live-status.tsx`
4. `src/components/dashboard/agent-strip.tsx`
5. `src/components/dashboard/cost-card.tsx`
6. `src/components/dashboard/dashboard-client.tsx`
7. `src/components/dashboard/kpi-cards.tsx`
8. `src/components/dashboard/memory-integrity.tsx`
9. `src/components/dashboard/subagent-monitor.tsx`
10. `src/components/dashboard/variable-cost-card.tsx`
11. `src/components/dashboard/worktree-status.tsx`
12. `src/components/layout/mobile-nav.tsx`
13. `src/components/layout/page-header.tsx`
14. `src/components/settings/agent-avatar-manager.tsx`
15. `src/components/settings/avatar-library.tsx`
16. `src/components/settings/default-avatar-settings.tsx`
17. `src/components/settings/model-display-config.tsx`
18. `src/components/settings/upload-avatar.tsx`
19. `src/components/ui/agent-avatar.tsx`

Also check these page files for hardcoded dark colors:
20. `src/app/(dashboard)/agents/page.tsx`
21. `src/app/(dashboard)/agents/[id]/page.tsx`
22. `src/app/(dashboard)/events/page.tsx`
23. `src/app/(dashboard)/costs/page.tsx`
24. `src/app/(dashboard)/settings/page.tsx`
25. `src/app/(dashboard)/tasks/page.tsx`
26. `src/app/(dashboard)/lab/page.tsx`
27. `src/app/(dashboard)/system/page.tsx`
28. `src/app/login/page.tsx`

## Verification
After ALL changes:
1. Run `npx tsc --noEmit` to check TypeScript
2. Commit with message: `feat: migrate all components to theme-aware classes for light/dark mode`

## IMPORTANT
- Do NOT touch `prisma/schema.prisma`
- Do NOT create new files — only edit existing ones
- Do NOT change component logic or layout — ONLY change color/theme classes
- Do NOT change the Recharts tooltip `contentStyle` backgroundColor/borderColor — those can stay hardcoded for now (charts are complex)
- Be thorough — check every file, every hardcoded zinc reference
