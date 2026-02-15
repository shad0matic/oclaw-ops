# X Bookmark Archiver

Archive and search your X/Twitter bookmarks using [bird CLI](https://github.com/PerplexityAI/bird) with zero-cost browser cookie authentication.

## Features

- 📥 **Fetch bookmarks** from X/Twitter via bird CLI
- 💾 **Save to Postgres** with automatic deduplication
- 🔍 **Full-text search** across saved bookmarks
- 📊 **Weekly digest** grouped by topics/themes
- 🔐 **Zero-cost auth** using browser cookies (no API keys needed)

## Prerequisites

1. **bird CLI** installed: `npm install -g @perplexity/bird`
2. **Logged into X.com** in Chrome, Firefox, or Safari
3. **PostgreSQL** with `ops.x_bookmarks` table (auto-created)
4. **Node.js** dependencies: `pg`, `dayjs`

## Installation

```bash
cd ~/projects/oclaw-ops
npm install pg dayjs
```

## Database Setup

The table is auto-created on first run, but you can create it manually:

```sql
CREATE TABLE IF NOT EXISTS ops.x_bookmarks (
  id SERIAL PRIMARY KEY,
  tweet_id TEXT UNIQUE NOT NULL,
  author TEXT,
  author_username TEXT,
  text TEXT,
  url TEXT,
  media_urls JSONB,
  bookmarked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB
);

CREATE INDEX idx_x_bookmarks_tweet_id ON ops.x_bookmarks(tweet_id);
CREATE INDEX idx_x_bookmarks_author ON ops.x_bookmarks(author_username);
CREATE INDEX idx_x_bookmarks_created_at ON ops.x_bookmarks(created_at);
CREATE INDEX idx_x_bookmarks_text_search ON ops.x_bookmarks USING gin(to_tsvector('english', text));
```

## Usage

### 1. Fetch Bookmarks (`x-bookmarks.mjs`)

Fetches bookmarks from X and saves to database.

```bash
# Fetch last 20 bookmarks
node tools/scripts/x-bookmarks.mjs

# Fetch 100 bookmarks
node tools/scripts/x-bookmarks.mjs --count 100

# Fetch all bookmarks (paginated)
node tools/scripts/x-bookmarks.mjs --all --max-pages 20

# Use specific Chrome profile
node tools/scripts/x-bookmarks.mjs --chrome-profile "Default"

# Use Firefox profile
node tools/scripts/x-bookmarks.mjs --firefox-profile "default-release"
```

**Options:**
- `--count, -n <number>` - Number of bookmarks to fetch (default: 20)
- `--all` - Fetch all bookmarks (paginated)
- `--max-pages <number>` - Max pages when using --all (default: 10)
- `--chrome-profile <name>` - Chrome profile for cookie extraction
- `--firefox-profile <name>` - Firefox profile for cookie extraction

### 2. Search Bookmarks (`x-bookmark-search.mjs`)

Full-text search across saved bookmarks.

```bash
# Search for "AI coding"
node tools/scripts/x-bookmark-search.mjs "AI coding"

# Filter by author
node tools/scripts/x-bookmark-search.mjs "bookmarks" --author trq212

# Limit results
node tools/scripts/x-bookmark-search.mjs "Claude" --limit 20

# Output as JSON
node tools/scripts/x-bookmark-search.mjs "vector search" --json
```

**Options:**
- `--author <username>` - Filter by author username
- `--limit <number>` - Max results to return (default: 10)
- `--json` - Output as JSON

### 3. Weekly Digest (`x-bookmark-digest.mjs`)

Generate a digest of recent bookmarks grouped by topic.

```bash
# Last 7 days (default)
node tools/scripts/x-bookmark-digest.mjs

# Last 14 days
node tools/scripts/x-bookmark-digest.mjs --days 14

# Export as markdown
node tools/scripts/x-bookmark-digest.mjs --markdown > digest.md
```

**Options:**
- `--days <number>` - Number of days to include (default: 7)
- `--markdown, --md` - Output as markdown

## Authentication

bird CLI automatically extracts cookies from your browser. Make sure you're logged into x.com in:

- **Chrome** - Default profile or specify with `--chrome-profile`
- **Firefox** - Default profile or specify with `--firefox-profile`
- **Safari** - Works by default on macOS

If cookie extraction fails, you can manually set environment variables:

```bash
export AUTH_TOKEN="your_auth_token_cookie"
export CT0="your_ct0_cookie"
```

To find these cookies:
1. Open x.com in your browser
2. Open DevTools → Application → Cookies
3. Copy `auth_token` and `ct0` values

## Automation

### Cron Job

Fetch bookmarks every 6 hours:

```bash
crontab -e
# Add:
0 */6 * * * cd ~/projects/oclaw-ops && node tools/scripts/x-bookmarks.mjs --count 50 >> ~/logs/x-bookmarks.log 2>&1
```

### Weekly Digest Email

Send digest every Monday morning:

```bash
0 9 * * 1 cd ~/projects/oclaw-ops && node tools/scripts/x-bookmark-digest.mjs --markdown | mail -s "Weekly X Bookmarks" you@email.com
```

## Database Schema

### `ops.x_bookmarks`

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `tweet_id` | TEXT | Unique tweet ID |
| `author` | TEXT | Author display name |
| `author_username` | TEXT | Author username (handle) |
| `text` | TEXT | Tweet text content |
| `url` | TEXT | Tweet URL |
| `media_urls` | JSONB | Array of media URLs |
| `bookmarked_at` | TIMESTAMPTZ | When bookmarked |
| `created_at` | TIMESTAMPTZ | When saved to DB |
| `updated_at` | TIMESTAMPTZ | Last update |
| `raw_data` | JSONB | Full tweet object from bird CLI |

## Troubleshooting

### "Missing required credentials"

bird CLI can't find browser cookies. Solutions:
1. Make sure you're logged into x.com
2. Try specifying browser profile: `--chrome-profile "Default"`
3. Set cookies manually via env vars (see Authentication section)

### "Cannot find package 'pg'"

Install dependencies:
```bash
cd ~/projects/oclaw-ops
npm install pg dayjs
```

### Duplicate key error

The script handles duplicates automatically using `tweet_id` as unique key. This shouldn't happen, but if it does, check for corrupted data:

```sql
SELECT tweet_id, COUNT(*) FROM ops.x_bookmarks GROUP BY tweet_id HAVING COUNT(*) > 1;
```

## Examples

### Daily Snapshot

```bash
#!/bin/bash
# Save daily snapshot
DATE=$(date +%Y-%m-%d)
cd ~/projects/oclaw-ops
node tools/scripts/x-bookmarks.mjs --count 100
node tools/scripts/x-bookmark-digest.mjs --days 1 --markdown > ~/bookmarks/digest-$DATE.md
```

### Search + Export

```bash
# Find all AI-related bookmarks and export to JSON
node tools/scripts/x-bookmark-search.mjs "AI machine learning" --limit 100 --json > ai-bookmarks.json
```

## Related

- [bird CLI](https://github.com/PerplexityAI/bird) - Fast X CLI for tweeting, reading, and searching
- [smaug](https://github.com/shad0matic/smaug) - Phil's bookmark analyzer with AI curation

## License

Part of oclaw-ops toolkit.
