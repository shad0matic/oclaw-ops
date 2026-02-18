# SPEC-085: KB Extraction Pipeline (Summaries + Embeddings)

**Task ID:** #85  
**Type:** Milestone (M2 of Smaug EPIC)  
**Priority:** P5  
**Status:** Planned  
**Depends On:** #83 (KB Bookmarks UI) — ✅ Done  

---

## Overview

Build the extraction layer that transforms raw bookmarks into structured knowledge:
- Generate summaries and key insights
- Create embeddings for semantic search
- Support video transcription workflow
- Power folder chat with relevant context

---

## Current State

### Done (from #83)
- Knowledge page with folder tree
- Bookmark list by folder
- Unassigned bookmarks view
- Folder CRUD (create, rename, delete)
- Drag bookmarks to folders
- X folder mapping to internal folders

### Missing
- No processing pipeline
- No embeddings
- No insights extraction
- Folder chat is placeholder only

### DB Schema
```sql
-- Already exists
ops.x_bookmarks (
  summary TEXT,           -- unused
  tags JSONB,            -- unused  
  relevance_score INT,   -- unused
  processed BOOLEAN,     -- only 6 true
  video_transcript TEXT, -- unused
  video_analysis TEXT    -- unused
)
```

---

## Phase 1: Processing Queue

### Queue Table
```sql
CREATE TABLE ops.kb_processing_queue (
  id SERIAL PRIMARY KEY,
  bookmark_id INT REFERENCES ops.x_bookmarks(id) UNIQUE,
  status TEXT DEFAULT 'pending', -- pending, processing, done, failed
  priority INT DEFAULT 5,
  attempts INT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

### Queue API
```
POST /api/knowledge/queue/add    -- Add bookmarks to queue
POST /api/knowledge/queue/batch  -- Add folder or all unprocessed
GET /api/knowledge/queue/status  -- Queue stats
POST /api/knowledge/queue/clear  -- Clear failed/completed
```

### Queue UI
In Knowledge page header:
- Queue stats badge: "42 pending / 3 processing / 1,204 done"
- "Process Now" button → triggers batch worker
- "Queue All Unprocessed" → bulk add

---

## Phase 2: Text Extraction

### Per-Bookmark Processing

Input: `x_bookmarks.text` + `x_bookmarks.raw_data`

Output:
```typescript
{
  summary: string,      // 1-2 sentence summary
  keyPoints: string[],  // Bullet points of main ideas
  topics: string[],     // Category tags
  tools: string[],      // Mentioned tools/products
  sentiment: 'positive' | 'neutral' | 'negative',
  relevanceScore: number // 1-10
}
```

### Prompt Template
```
Analyze this X/Twitter post and extract:
1. A 1-2 sentence summary
2. Key points (bullet list)
3. Topics/categories it belongs to
4. Any tools, products, or resources mentioned
5. Overall sentiment
6. Relevance score (1-10) for a tech founder

Post:
{text}

Author: {author}
```

### Model Selection
- Primary: Gemini (flat rate)
- Fallback: Haiku (cheap)
- Never: Opus (overkill)

### Batch Processing
- Process 10 bookmarks per batch
- 2-second delay between batches (rate limiting)
- Resume from last position on restart
- Skip already processed

---

## Phase 3: Video Pipeline

### Detection
Check `x_bookmarks.media_urls` for video indicators:
- `.mp4`, `.m3u8` URLs
- `type: "video"` in media metadata

### Workflow
1. **Download** via yt-dlp (spawn Phil)
   ```bash
   yt-dlp -o "/tmp/kb-video-{id}.mp4" "{tweet_url}"
   ```

2. **Compress** to audio
   ```bash
   ffmpeg -i video.mp4 -vn -acodec libmp3lame -b:a 64k -ac 1 audio.mp3 -y
   ```

3. **Split** if >25MB
   ```bash
   ffmpeg -i audio.mp3 -f segment -segment_time 1200 -c copy chunk_%03d.mp3
   ```

4. **Transcribe** via Whisper API
   ```bash
   curl -s https://api.openai.com/v1/audio/transcriptions \
     -H "Authorization: Bearer $OPENAI_API_KEY" \
     -F file="@audio.mp3" \
     -F model="whisper-1" \
     -F response_format="text"
   ```

5. **Extract insights** from transcript (same as text processing)

### Storage
- Transcript → `x_bookmarks.video_transcript`
- Analysis → `x_bookmarks.video_analysis`
- Set `video_processed = true`

### Cleanup
Delete temp files after processing:
```bash
rm /tmp/kb-video-{id}.*
```

---

## Phase 4: Embeddings

### Insights Table
```sql
CREATE TABLE ops.kb_insights (
  id SERIAL PRIMARY KEY,
  bookmark_id INT REFERENCES ops.x_bookmarks(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL, -- 'summary' | 'key_point' | 'tool' | 'quote'
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kb_insights_bookmark ON ops.kb_insights(bookmark_id);
CREATE INDEX idx_kb_insights_type ON ops.kb_insights(insight_type);
CREATE INDEX idx_kb_insights_embedding ON ops.kb_insights 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### Embedding Generation
After text extraction, for each insight:
```typescript
const embedding = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: insight.content
});
```

Cost: ~$0.00002 per insight (negligible)

---

## Phase 5: Semantic Search

### Search API
```
GET /api/knowledge/search?q=query&folderId=X&limit=20
Response: {
  results: [{
    bookmarkId: number,
    insightId: number,
    content: string,
    score: number,
    bookmarkUrl: string
  }]
}
```

### Implementation
```sql
SELECT 
  ki.id, ki.content, ki.bookmark_id,
  1 - (ki.embedding <=> $1) as score
FROM ops.kb_insights ki
JOIN ops.x_bookmarks xb ON xb.id = ki.bookmark_id
JOIN ops.bookmark_folder_items bfi ON bfi.bookmark_id = xb.id
WHERE bfi.folder_id = $2
ORDER BY ki.embedding <=> $1
LIMIT 20;
```

---

## Phase 6: Folder Chat

### Chat API
```
POST /api/knowledge/chat
Body: { folderId: number, message: string }
Response: { reply: string, sources: [...] }
```

### Context Assembly
1. Embed user message
2. Find top 10 similar insights in folder
3. Build context:
   ```
   You are a helpful assistant with access to a knowledge base.
   
   Relevant context from bookmarks:
   [Insight 1: ...]
   [Insight 2: ...]
   ...
   
   User question: {message}
   ```
4. Generate response with Gemini
5. Return reply + source bookmarks

### UI
- Chat panel in folder sidebar
- Message history per folder
- Source citations with links

---

## Implementation Order

1. **Processing queue** — foundation for batch work
2. **Text extraction** — covers 90% of bookmarks
3. **Embeddings** — enable search
4. **Search UI** — surface extracted insights
5. **Video pipeline** — heavier, separate pass
6. **Folder chat** — capstone feature

---

## Cost Estimate

| Component | Per Item | Total (6K bookmarks) |
|-----------|----------|----------------------|
| Text extraction (Gemini) | Free | $0 |
| Video download | Free | $0 |
| Audio transcription | ~$0.30/video | ~$100 (est. 300 videos) |
| Embeddings | $0.00002 | ~$1 |
| **Total** | | **~$100** |

---

## Progress Tracking

Dashboard stats card:
```
Knowledge Base Stats
━━━━━━━━━━━━━━━━━━━━
📚 6,057 bookmarks
📝 1,204 processed (20%)
🎬 47 videos transcribed
🔍 15,432 insights indexed
```

---

## Success Criteria

- [ ] Processing queue functional
- [ ] 80%+ text bookmarks processed
- [ ] Insights extracted and stored
- [ ] Embeddings generated
- [ ] Search returns relevant results
- [ ] 50+ videos transcribed
- [ ] Folder chat responds with context
