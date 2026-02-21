# Browser Bookmark Import - Quick Start

## 🚀 5-Minute Setup

### Step 1: Export Your Bookmarks

**Chrome:**
1. Open `chrome://bookmarks`
2. Click ⋮ (three dots) menu
3. Select "Export bookmarks"
4. Save `bookmarks_*.html` or `Bookmarks` JSON file

**Firefox:**
1. Open Library (Ctrl+Shift+B)
2. Import and Backup → Backup
3. Save `bookmarks-YYYY-MM-DD.json`

### Step 2: Import to OpenClaw

1. Navigate to **Settings** in the dashboard
2. Scroll to **Browser Bookmarks** section
3. Drag & drop your export file or click to select
4. Review the preview (shows total count and folder distribution)
5. Click "Import X Bookmarks"

✅ Done! Your bookmarks are now in the database with status `pending`

### Step 3: Run Background Processing

**Option A: Click the Button** (Easiest)
- Click "Run Pipeline" in the Bookmark Pipeline Status card
- Watch progress in real-time

**Option B: Set Up Automated Processing** (Recommended)
1. Go to **Cron Jobs** in the dashboard
2. Create new job with:
   - **Name:** Bookmark Auto-Processor
   - **Schedule:** `0 */2 * * *` (every 2 hours)
   - **Prompt:**
     ```
     Run the bookmark processing pipeline:
     curl -X POST http://localhost:3000/api/browser-bookmarks/process
     
     Report the results.
     ```
   - **Model:** gemini-2.0-flash-exp (cheap for automation)
   - **Session:** isolated

3. Enable the job

**Option C: Manual API Call**
```bash
curl -X POST http://localhost:3000/api/browser-bookmarks/process
```

### Step 4: Categorize Your Bookmarks

Once bookmarks are summarized, you'll receive Telegram prompts like:

```
🔖 New Bookmark to Categorize

**Why React Hooks Are Awesome**
https://blog.example.com/react-hooks

📝 Summary:
This article explains React Hooks and why they
simplify state management in functional components...

🏷️ Suggested Tags: react, javascript, tutorial

📁 Available Folders:
1. Web Development
2. React Resources
3. Tutorials

Choose: 1, 2, 3, or type "new: Folder Name"
```

Reply with:
- A number to assign to that folder
- `new: My New Folder` to create a folder
- `skip` to categorize later

## 📊 Monitor Progress

### Dashboard Stats
The Settings page shows:
- Total bookmarks imported
- Pending validation count
- Alive/Dead link stats
- Summarization progress
- Last pipeline run results

### Database Queries
```sql
-- Check overall progress
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'alive') as alive,
  COUNT(*) FILTER (WHERE summary IS NOT NULL) as summarized,
  COUNT(*) FILTER (WHERE kb_folder_id IS NOT NULL) as categorized
FROM ops.browser_bookmarks;

-- View recent bookmarks
SELECT title, status, summary IS NOT NULL as has_summary
FROM ops.browser_bookmarks
ORDER BY imported_at DESC
LIMIT 10;
```

## 🎯 What Happens Behind the Scenes

### Pipeline Phases

1. **Validation** (2-3 min for 1000 bookmarks)
   - HEAD request to each URL
   - Mark as: `alive`, `dead`, `redirect`, or `error`
   - Updates `http_code` and `checked_at`

2. **Scraping** (~30s per bookmark)
   - Loads page in headless browser
   - Extracts readable content with Readability
   - Captures metadata (title, favicon, OG tags)

3. **Summarization** (~2s per bookmark)
   - Sends content to Gemini Flash (L1 model)
   - Generates 2-3 sentence summary
   - Extracts key points
   - Suggests tags

4. **Categorization** (Interactive)
   - Telegram prompts with summary
   - User assigns to folder
   - Updates `kb_folder_id`

## 💡 Pro Tips

### Batch Sizes
Adjust processing speed with query parameters:

```bash
# Faster validation (more parallel)
POST /api/browser-bookmarks/validate?batch=50

# Slower scraping (avoid rate limits)
POST /api/browser-bookmarks/scrape?batch=3

# More summarization per run
POST /api/browser-bookmarks/summarize?batch=20
```

### Scheduled Categorization
Add this to your heartbeat or create a daily cron:

```
Check for bookmarks ready for categorization:
POST /api/browser-bookmarks/categorize?batch=5

Send me interactive prompts for each one.
```

### Re-Validate Old Bookmarks
Periodically check if old bookmarks are still alive:

```sql
UPDATE ops.browser_bookmarks
SET status = 'pending', checked_at = NULL
WHERE checked_at < NOW() - INTERVAL '6 months'
  AND status = 'alive';
```

Then run validation again.

### Export Organized Bookmarks
Once categorized, export to HTML:

```sql
SELECT 
  bf.name as folder,
  bb.title,
  bb.url,
  bb.summary
FROM ops.browser_bookmarks bb
JOIN ops.bookmark_folders bf ON bb.kb_folder_id = bf.id
ORDER BY bf.name, bb.title;
```

## 🔧 Troubleshooting

### "No items to process"
- Check import was successful: `SELECT COUNT(*) FROM ops.browser_bookmarks`
- Verify status: `SELECT status, COUNT(*) FROM ops.browser_bookmarks GROUP BY status`

### Pipeline runs but nothing happens
- Check logs in browser console (F12)
- Run each phase manually to isolate issue:
  ```bash
  POST /api/browser-bookmarks/validate
  POST /api/browser-bookmarks/scrape
  POST /api/browser-bookmarks/summarize
  ```

### Categorization prompts not appearing
- Ensure bookmarks are summarized: `SELECT COUNT(*) FROM ops.browser_bookmarks WHERE summary IS NOT NULL`
- Manually fetch: `POST /api/browser-bookmarks/categorize`
- Check Telegram connection

## 📚 Next Steps

- Set up automated pipeline cron job
- Configure categorization reminders
- Explore the Knowledge Base page to browse folders
- Create custom folder hierarchies
- Add manual bookmarks via API

## 🆘 Need Help?

- Full docs: [BOOKMARK_PIPELINE.md](./BOOKMARK_PIPELINE.md)
- Categorization guide: [BOOKMARK_CATEGORIZATION.md](./BOOKMARK_CATEGORIZATION.md)
- Database schema: Check `/db-schema.html` in dashboard
