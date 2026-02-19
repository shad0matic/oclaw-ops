# M4: AI Auto-Categorization

**Status:** Draft  
**Author:** Kevin 🍌  
**Date:** 2026-02-19  
**Task:** #94  
**Parent Epic:** #48 Smaug KB Pipeline  
**Depends On:** M3 (Manual Categorization), Bulk Operations (#93)

---

## Overview

Use AI (Gemini Flash) to automatically suggest categories for uncategorized bookmarks. User reviews suggestions before applying.

---

## Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Uncategorized│────▶│ AI Suggests │────▶│ User Reviews│────▶│   Applied   │
│  Bookmarks   │     │  Category   │     │  & Approves │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

---

## Features

### 1. Auto-Categorize Button

**Location:** Bookmarks page toolbar, near filter controls

**Behavior:**
- Shows count of uncategorized bookmarks
- Click → Opens AI categorization modal
- Disabled if no uncategorized bookmarks

### 2. AI Categorization Modal

**Step 1: Configure**
```
┌────────────────────────────────────────────────┐
│ 🤖 Auto-Categorize Bookmarks                   │
│                                                │
│ Found 47 uncategorized bookmarks               │
│                                                │
│ Process: ○ All uncategorized                   │
│          ○ Selected only (12)                  │
│          ○ First N: [20____]                   │
│                                                │
│ Model: [Gemini 2.0 Flash ▼]                    │
│                                                │
│ Estimated cost: ~$0.02                         │
│                                                │
│              [Cancel]  [Start Analysis]        │
└────────────────────────────────────────────────┘
```

**Step 2: Processing**
- Progress bar showing batch progress
- Can cancel mid-process
- Results stream in as they complete

**Step 3: Review & Apply**
```
┌────────────────────────────────────────────────────────┐
│ 🤖 Review Suggestions                    [Apply All]   │
│                                                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ ☑ "Thread on AI agents for coding"                 │ │
│ │   → 🤖 AI/ML                          [Change ▼]   │ │
│ ├────────────────────────────────────────────────────┤ │
│ │ ☑ "Best practices for Next.js 15"                  │ │
│ │   → 💻 Development                    [Change ▼]   │ │
│ ├────────────────────────────────────────────────────┤ │
│ │ ☐ "Random meme about startups"                     │ │
│ │   → ❓ Uncategorized (low confidence) [Change ▼]   │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ 45/47 will be categorized                              │
│                                                        │
│              [Cancel]  [Apply Selected (45)]           │
└────────────────────────────────────────────────────────┘
```

---

## API

### Analyze Bookmarks
```
POST /api/x-bookmarks/auto-categorize
Body: { 
  bookmark_ids?: string[],  // Optional, defaults to all uncategorized
  limit?: number,
  model?: string  // Default: gemini-2.0-flash
}

Response: {
  suggestions: [
    { 
      bookmark_id: string,
      suggested_category_id: number,
      suggested_category_name: string,
      confidence: number,  // 0-1
      reasoning: string
    }
  ],
  cost_usd: number
}
```

### Apply Suggestions
```
POST /api/x-bookmarks/auto-categorize/apply
Body: {
  assignments: [
    { bookmark_id: string, category_id: number }
  ]
}
```

---

## AI Prompt

```
You are categorizing X/Twitter bookmarks into folders.

Available categories:
{{categories}}

For each bookmark, respond with JSON:
{
  "bookmark_id": "...",
  "category": "category_name or null if unsure",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Bookmarks to categorize:
{{bookmarks}}
```

**Input per bookmark:**
- Tweet text
- Author handle
- Summary (if available)
- Tags (if available)

---

## Database

Add to `ops.x_bookmarks`:
```sql
ALTER TABLE ops.x_bookmarks ADD COLUMN 
  ai_suggested_category_id INTEGER,
  ai_confidence REAL,
  ai_reasoning TEXT;
```

---

## Acceptance Criteria

- [ ] Button shows uncategorized count
- [ ] Can configure batch size before processing
- [ ] AI suggestions shown with confidence scores
- [ ] Can override AI suggestion per-bookmark
- [ ] Can deselect bookmarks to skip
- [ ] Apply updates all selected at once
- [ ] Low-confidence suggestions highlighted
- [ ] Cost estimate shown before processing

---

## Cost Control

- Use Gemini Flash (cheap, fast)
- Batch bookmarks (10-20 per request)
- Show estimated cost before starting
- Track actual cost in response
