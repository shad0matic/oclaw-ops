# Browser Bookmark Import Pipeline

## Overview

A complete pipeline for importing browser bookmarks (Chrome/Firefox), validating URLs, scraping content, generating summaries, and interactively categorizing them via Telegram for Knowledge Base enrichment.

## Architecture

### Components

1. **Upload UI** (`/settings` page) - Upload and parse bookmark exports
2. **Validation Worker** - Detect dead links and redirects
3. **Scraping Worker** - Extract readable content using Playwright + Readability
4. **Summarization Worker** - Generate L1 summaries using Gemini Flash
5. **Categorization Interface** - Interactive Telegram prompts for folder assignment
6. **Pipeline Orchestrator** - Runs all phases in sequence

### Database Schema

**Table:** `ops.browser_bookmarks`

Key fields:
- `url` (unique) - Bookmark URL
- `title` - Page title
- `folder_path` - Original browser folder path
- `status` - `pending` | `alive` | `dead` | `redirect` | `error`
- `http_code` - HTTP response code
- `content` - Scraped readable text
- `summary` - L1 summary with key points and tags
- `kb_folder_id` - FK to bookmark_folders
- `tags` - Suggested categorization tags
- `boss_categorized` - Whether sent to user for categorization

## API Endpoints

### Upload & Parse
- `POST /api/browser-bookmarks` - Parse and import bookmark files
  - Action: `parse` - Preview bookmarks before import
  - Action: `import` - Import bookmarks to database

### Background Workers
- `POST /api/browser-bookmarks/validate` - Validate URLs (Phase 2)
- `POST /api/browser-bookmarks/scrape` - Scrape content (Phase 3a)
- `POST /api/browser-bookmarks/summarize` - Generate summaries (Phase 3b)
- `POST /api/browser-bookmarks/categorize` - Prepare for categorization (Phase 4)

### Orchestrator
- `POST /api/browser-bookmarks/process` - Run full pipeline
- `GET /api/browser-bookmarks/process` - Get pipeline status

### Categorization Assignment
- `PATCH /api/browser-bookmarks/categorize` - Assign bookmark to folder

## Usage

### 1. Import Bookmarks

1. Go to Settings page
2. Export bookmarks from your browser:
   - **Chrome:** `chrome://bookmarks` → ⋮ → Export bookmarks
   - **Firefox:** Bookmarks → Manage → Import & Backup → Backup
3. Upload the JSON file
4. Review preview and click "Import"

### 2. Run Background Processing

#### Manual (via UI)
Click "Run Pipeline" button on Settings page

#### Manual (via API)
```bash
curl -X POST http://localhost:3000/api/browser-bookmarks/process
```

#### Automated (via Cron)
Create a cron job to run every hour:

**Name:** Bookmark Processing Pipeline  
**Schedule:** `0 * * * *` (every hour)  
**Prompt:**
```
Run the bookmark processing pipeline to validate, scrape, and summarize newly imported bookmarks.

curl -X POST http://localhost:3000/api/browser-bookmarks/process
```

### 3. Categorize Bookmarks

See [BOOKMARK_CATEGORIZATION.md](./BOOKMARK_CATEGORIZATION.md) for interactive Telegram workflow.

## Pipeline Phases

### Phase 1: Upload UI ✅
- Parse Chrome/Firefox JSON exports
- Detect format automatically
- Preview folder distribution
- Bulk import with duplicate detection

### Phase 2: URL Validation ✅
- Batch HTTP HEAD requests
- Detect 404s, redirects, errors
- Configurable timeout and batch size
- Rate limiting protection

### Phase 3: Scraping & Summarization ✅
- **Scraping:** Playwright headless browser + Mozilla Readability
- **Content extraction:** Clean article text, metadata (OG tags, favicon)
- **Summarization:** Gemini Flash (L1 model) generates:
  - 2-3 sentence summary
  - Key points (bullet list)
  - Suggested tags

### Phase 4: Interactive Categorization ✅
- Telegram prompts with summary
- Folder selection or creation
- Skip option for uncertain items
- Batch processing (5-10 at a time)

### Phase 5: KB Integration ✅
- Assign bookmarks to folders via `kb_folder_id`
- Tag-based organization
- Hierarchical folder structure

## Model Nomenclature

- **L1 (Cheap):** Gemini Flash - Fast, low-cost summarization
- **L2 (Standard):** Claude Sonnet - Balanced performance
- **L3 (Deep):** Claude Opus - Complex reasoning (not used in this pipeline)

## Configuration

### Batch Sizes
- **Validation:** 20 per batch (adjustable via `?batch=N`)
- **Scraping:** 5 per batch (browser overhead)
- **Summarization:** 10 per batch (API rate limits)
- **Categorization:** 5 per batch (user attention span)

### Timeouts
- **Validation:** 5 seconds per URL
- **Scraping:** 10 seconds per page

### Environment Variables
- `GEMINI_API_KEY` - Required for summarization

## Monitoring

### UI Dashboard
- Settings page shows pipeline status card with:
  - Total bookmarks
  - Pending validation count
  - Alive/Dead/Error stats
  - Summarization progress
  - Run pipeline button

### Database Queries
```sql
-- Overall stats
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'alive') as alive,
  COUNT(*) FILTER (WHERE summary IS NOT NULL) as summarized,
  COUNT(*) FILTER (WHERE kb_folder_id IS NOT NULL) as categorized
FROM ops.browser_bookmarks;

-- Recent imports
SELECT url, title, status, checked_at, scraped_at, summarized_at
FROM ops.browser_bookmarks
ORDER BY imported_at DESC
LIMIT 20;
```

## Error Handling

- **Network errors:** Retry with exponential backoff
- **Scraping failures:** Mark as error, continue batch
- **Summarization failures:** Log error, skip bookmark
- **Rate limiting:** Built-in delays between requests

## Performance

- **Import:** ~1000 bookmarks/second (parse)
- **Validation:** ~6 URLs/second (with 100ms delay)
- **Scraping:** ~30 seconds per bookmark (page load + extraction)
- **Summarization:** ~2 seconds per bookmark (Gemini Flash)

For 1000 bookmarks:
- Validation: ~3 minutes
- Scraping: ~8 hours (run in background)
- Summarization: ~30 minutes

## Future Enhancements

- [ ] Parallel scraping with worker pool
- [ ] Screenshot capture for visual bookmarks
- [ ] Automatic tag refinement using embeddings
- [ ] Duplicate detection (similar content)
- [ ] Scheduled re-validation of old bookmarks
- [ ] Export to other KB systems
- [ ] Full-text search integration
- [ ] Browser extension for real-time capture

## Troubleshooting

### Import fails with "Unrecognized format"
- Ensure you exported from the browser (not manual JSON)
- Check file is valid JSON
- Try both Chrome and Firefox export methods

### Validation stuck on "pending"
- Run the pipeline manually: `POST /api/browser-bookmarks/process`
- Check network connectivity
- Increase timeout: `POST /api/browser-bookmarks/validate?timeout=10000`

### Scraping produces empty content
- Website may require JavaScript rendering (Playwright should handle this)
- Check content_type field - may be error
- Try visiting URL manually to verify accessibility

### Summarization fails
- Verify GEMINI_API_KEY is set
- Check API quota/billing
- Review error logs in browser console

## Related Documentation

- [BOOKMARK_CATEGORIZATION.md](./BOOKMARK_CATEGORIZATION.md) - Interactive categorization workflow
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Full schema documentation
