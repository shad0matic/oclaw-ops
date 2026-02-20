# 🧠 Knowledge Base Project

> Self-growing KB system with agent enrichment

**Status:** Planning
**Created:** 2026-02-20
**Owner:** Boss
**MC Project:** `kb`

---

## Vision

A "snowballing" knowledge base that:
1. **Seeds** with Boss's ideas, bookmarks, research requests, voice notes
2. **Grows** via agent enrichment (Nefario deep dives, cross-referencing)
3. **Connects** practical applications to existing projects
4. **Resurfaces** relevant insights proactively ("You bookmarked X 3 months ago, it's now relevant to what you're building")

**Scale target:** x1M growth (product-scale, not personal-scale)

---

## Core Loop

```
┌─────────────────────────────────────────────────────────┐
│  INPUTS                                                 │
│  • Bookmarks (X, web)                                   │
│  • Voice notes                                          │
│  • Research requests                                    │
│  • Random ideas in chat                                 │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│  AGENT ENRICHMENT                                       │
│  • Nefario deep dives                                   │
│  • Cross-reference with existing KB                     │
│  • Find related threads/concepts                        │
│  • Tag, categorize, link                                │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│  PRACTICAL LAYER                                        │
│  • "This insight → applies to TaskBee"                  │
│  • "This technique → actionable for Teen Founder"       │
│  • Project-specific recommendations                     │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│  PROACTIVE RESURFACING                                  │
│  • "You bookmarked X, now relevant to current work"     │
│  • Pattern detection across entries                     │
│  • Scheduled digests                                    │
└─────────────────────────────────────────────────────────┘
```

---

## Architecture Decisions

### NOT SQLite
Original research (Nefario) recommended SQLite + FTS5 + sqlite-vec for personal use.

**However:** Boss envisions x1M scale growth → product territory.

At that scale, need:
- **Postgres + pgvector** (proven, scales well, managed options)
- Or **dedicated vector DB** (Qdrant/Weaviate) if semantic search is core
- Proper backend service, horizontal scaling capability
- Multi-tenant architecture

### Model Tiering for Enrichment
```
Tier 1 (MiniMax/cheap)    → Nightly bulk processing, first-pass summaries, tagging
Tier 2 (Sonnet)           → Synthesis, cross-linking, connecting dots  
Tier 3 (Opus)             → Deep research, complex analysis, explicit trigger only
```

### Cost Management
- Main workflow: research based on bookmarks + manual queries
- Nightly cron with cheap/free models (MiniMax) for intensive first pass
- Limited daily time for powerful models with careful budget
- Escalation system vs latest-model-only → **escalation wins**

---

## Roadmap

### Phase 1: Dave (Accountant Agent) ⬅️ CURRENT
**Prerequisite for everything else.**

Before any autonomous agents run unsupervised, we need:
- Accurate per-agent cost tracking
- Daily/weekly budget caps with hard stops
- Clear reporting ("last night's run cost €X")
- Budget alerts before hitting limits

**Task:** #124 — Spec Dave (Accountant Agent) Requirements

### Phase 2: Nightly Light Processing
- MiniMax on bookmarks, capped budget
- Basic tagging, summarization
- Runs only after Dave is reliable

### Phase 3: Escalation System
- Tier routing with spend limits
- Automatic escalation for complex items
- Budget-aware model selection

### Phase 4: Proactive Enrichment
- Cross-referencing existing KB
- Pattern detection
- "Related insights" surfacing
- Practical application suggestions

---

## Current State (Baby Steps Already Done)

✅ Smaug archiving X bookmarks
✅ Folder structure + project mapping  
✅ Nefario research outputs going to `/research/`
✅ KB project created in MC

### Missing Pieces
- [ ] Cross-linking / graph structure (not just folders)
- [ ] "Related insights" surfacing
- [ ] Proactive agent loop ("I noticed this connects to...")
- [ ] Practical application tracking
- [ ] Cost tracking (Dave)

---

## Key Questions (To Resolve)

1. **Storage:** Postgres + pgvector vs dedicated vector DB?
2. **Sync:** Mobile access strategy at scale?
3. **Sharing:** Multi-user / collaborative features later?
4. **Budget:** Monthly cap for autonomous enrichment?

---

## Related Files

- `memory/research/kb-architecture.md` — Nefario's original architecture research (SQLite recommendation, pre-scale discussion)
- MC Project: `kb` — https://vps-ovh.tail404904.ts.net:3000/tasks?project=kb

---

## Discussion Thread

Telegram topic: https://t.me/c/3396419207/7263
