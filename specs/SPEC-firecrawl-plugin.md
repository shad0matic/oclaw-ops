# SPEC: Firecrawl Plugin for Advanced Web Scraping

## Overview
Implement Firecrawl integration for advanced web scraping capabilities in OpenClaw. Firecrawl provides AI-powered content extraction, JavaScript rendering, and structured data extraction - superior to basic HTTP scraping.

## Requirements

### 1. Firecrawl API Integration
- Connect to Firecrawl API (https://firecrawl.dev)
- Support for scraping single URLs
- Support for crawling entire websites
- Support for structured data extraction
- Support for website mapping

### 2. Database Integration
- Update existing `ops.browser_bookmarks` table with Firecrawl-scraped content
- Store markdown, HTML, metadata, and links
- Content type detection (article, video, code, etc.)

### 3. Runner Script
- Process bookmarks from database in batches
- Rate limiting support
- Error handling and logging

## Files Created

### `tools/firecrawl-scraper.mjs`
Main plugin script with the following features:
- **Single URL scraping**: `node firecrawl-scraper.mjs --url "https://example.com"`
- **Batch processing**: `node firecrawl-scraper.mjs --batch 10`
- **Website crawling**: `node firecrawl-scraper.mjs --crawl "https://example.com" --limit 20`
- **Structured extraction**: `node firecrawl-scraper.mjs --extract "https://example.com" --schema '{...}'`
- **Website mapping**: `node firecrawl-scraper.mjs --map "https://example.com"`

### `tools/run-firecrawl-scraper.sh`
Shell wrapper script for easy execution with environment variable loading.

## Environment Variables
- `FIRECRAWL_API_KEY`: Required API key from https://firecrawl.dev

## Usage Examples

```bash
# Set API key
export FIRECRAWL_API_KEY=fc-xxxxx

# Scrape a single URL
node firecrawl-scraper.mjs --url "https://example.com"

# Process 10 bookmarks from database
node firecrawl-scraper.mjs --batch 10

# Crawl a website (max 50 pages)
node firecrawl-scraper.mjs --crawl "https://example.com" --limit 50

# Extract structured data with schema
node firecrawl-scraper.mjs --extract "https://example.com" --schema '{"name": "string", "price": "number"}'

# Map website structure
node firecrawl-scraper.mjs --map "https://example.com"
```

## Advantages Over Basic Scraping

| Feature | Basic HTTP | Firecrawl |
|---------|------------|-----------|
| Content extraction | Readability only | AI-powered |
| JavaScript rendering | ❌ | ✅ |
| Structured data | ❌ | ✅ |
| Rate limits | Self-managed | Built-in |
| Dynamic content | ❌ | ✅ |
| Site mapping | ❌ | ✅ |

## Status
- [x] Firecrawl API wrapper implemented
- [x] Single URL scraping
- [x] Batch processing from database
- [x] Website crawling
- [x] Structured data extraction
- [x] Website mapping
- [x] Runner script
- [ ] Integration tests
- [ ] API key configuration in deployment
