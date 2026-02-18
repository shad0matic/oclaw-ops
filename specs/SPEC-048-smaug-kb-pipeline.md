# SPEC-048: Smaug KB Pipeline — X Bookmarks → Knowledge Base

**Task ID:** #48  
**Type:** EPIC  
**Priority:** P5  
**Status:** Planned  
**Depends On:** Phil 🐊 with working X cookies  

---

## Overview

End-to-end pipeline that transforms raw X bookmarks into actionable knowledge:
1. **Ingest** — Fetch bookmarks via Phil (bird CLI + cookies)
2. **Process** — Extract summaries, key insights, tags
3. **Store** — Save to KB with embeddings for semantic search
4. **Surface** — Make searchable/usable in MC dashboard

---

## Current State

- **6,057 bookmarks** in `ops.x_bookmarks` (only 6 processed)
- Phil 🐊 configured but **awaiting X cookies** via Settings UI
- Knowledge page exists with folder tree + bookmark list (UI only, no extraction)
- No embeddings table yet
- No processing pipeline

---

## Phase 1: Cookie Entry & Validation

### Settings UI Enhancement
Add X/Twitter section to `/settings` page:
- Cookie input fields (auth_token, ct0, twid)
- "Test Connection" button → calls Phil to verify creds
- Status indicator: 🔴 Not configured / 🟡 Testing / 🟢 Valid
- Last sync timestamp

### API Endpoint
```
POST /api/settings/x-cookies
Body: { auth_token, ct0, twid }
Response: { valid: boolean, username?: string, error?: string }
```

Storage: `/home/shad/.openclaw/phil-config.json`

---

## Phase 2: Bookmark Sync

### Manual Sync
Button in Knowledge page header: "🔄 Sync Bookmarks"
- Spawns Phil to fetch latest bookmarks
- Progress indicator during sync
- Toast on completion with count

### API Endpoint
```
POST /api/bookmarks/sync
Response: { added: number, updated: number, total: number }
```

### Cron Job (Optional)
Weekly bookmark sync — only after manual flow is proven

---

## Phase 3: Extraction Pipeline

### Per-Bookmark Processing

For each unprocessed bookmark:

1. **Text Analysis** (all bookmarks)
   - Summary (1-2 sentences)
   - Key topics/tags
   - Relevance score (1-10)
   - Category suggestion

2. **Video Processing** (if has video)
   - Download via yt-dlp
   - Compress audio (ffmpeg 64kbps mono)
   - Transcribe (Whisper API)
   - Extract insights from transcript

3. **Thread Expansion** (if is thread)
   - Fetch full thread via Phil
   - Combine into single text block

### DB Schema Addition
```sql
CREATE TABLE ops.kb_insights (
  id SERIAL PRIMARY KEY,
  bookmark_id INT REFERENCES ops.x_bookmarks(id),
  insight_type TEXT, -- 'summary' | 'key_point' | 'tool' | 'technique' | 'quote'
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI ada-002
  confidence FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kb_insights_embedding ON ops.kb_insights 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### Processing Queue
Use existing `ops.task_queue` with `project = 'kb-pipeline'`:
- Batch processing (10 bookmarks at a time)
- Resume on failure
- Progress tracking

---

## Phase 4: Knowledge UI

### Insights Tab
Add to Knowledge page alongside Bookmarks:
- Grouped by topic/folder
- Search with semantic matching
- Filter by insight type
- Edit/delete individual insights

### Folder Chat
Each folder gets a chat interface:
- Context: all bookmarks + insights in folder
- Ask questions about the content
- Uses embeddings for relevant context retrieval

### API Endpoints
```
GET /api/knowledge/insights?folderId=X&search=query
GET /api/knowledge/insights/:id
PATCH /api/knowledge/insights/:id
DELETE /api/knowledge/insights/:id
POST /api/knowledge/chat { folderId, message }
```

---

## Phase 5: Weekly Digest

Cron job generating summary:
- New bookmarks added
- Key insights extracted
- Recommended reading
- Delivered to Boss via Telegram

---

## Implementation Order

1. **Cookie UI** → unblocks everything (needs Boss input)
2. **Manual sync button** → test Phil integration
3. **Text extraction** → process non-video bookmarks first
4. **Video pipeline** → heavier, do separately
5. **Insights UI** → display extracted knowledge
6. **Folder chat** → semantic search + chat
7. **Weekly digest** → automation

---

## Cost Considerations

- **Whisper API:** ~$0.006/min audio (capped by 25MB limit)
- **Embeddings:** ~$0.0001 per 1K tokens (negligible)
- **LLM for extraction:** Use Gemini (flat rate) or Haiku (cheap)

Estimated total for 6K bookmarks: ~$10-20 one-time

---

## Success Criteria

- [ ] X cookies entered and validated
- [ ] Manual sync fetches new bookmarks
- [ ] 100% of text-only bookmarks processed
- [ ] 50%+ of video bookmarks transcribed
- [ ] Insights searchable in UI
- [ ] Folder chat returns relevant context
