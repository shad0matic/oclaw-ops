#!/usr/bin/env node
/**
 * firecrawl-scraper.mjs — Advanced web scraping using Firecrawl AI
 * 
 * Firecrawl provides superior scraping capabilities compared to basic HTTP:
 * - AI-powered content extraction
 * - JavaScript rendering support
 * - Structured data extraction
 * - Better handling of dynamic content
 * - URL crawling and site mapping
 * 
 * Environment Variables:
 *   FIRECRAWL_API_KEY - Your Firecrawl API key (get from https://firecrawl.dev)
 * 
 * Usage:
 *   # Set API key
 *   export FIRECRAWL_API_KEY=fc-xxxxx
 *   
 *   # Scrape a single URL
 *   node firecrawl-scraper.mjs --url "https://example.com"
 *   
 *   # Scrape multiple URLs from database
 *   node firecrawl-scraper.mjs --batch 10
 *   
 *   # Crawl a website
 *   node firecrawl-scraper.mjs --crawl "https://example.com" --limit 50
 *   
 *   # Extract structured data
 *   node firecrawl-scraper.mjs --extract "https://example.com" --schema '{"name": "string", "price": "number"}'
 */

import pg from 'pg';
import https from 'https';
import http from 'http';
import { URL } from 'url';

const pool = new pg.Pool({
  database: process.env.PGDATABASE || 'openclaw_db',
  user: process.env.PGUSER || 'openclaw',
  host: '/var/run/postgresql'
});

const API_BASE = 'https://api.firecrawl.dev';
const BATCH_SIZE = 5;
const REQUEST_TIMEOUT = 30000;

/**
 * Get Firecrawl API key from environment
 */
function getApiKey() {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error('FIRECRWAL_API_KEY environment variable not set. Get your API key from https://firecrawl.dev');
  }
  return apiKey;
}

/**
 * Make request to Firecrawl API
 */
function firecrawlRequest(endpoint, method = 'POST', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${endpoint}`);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${getApiKey()}`,
        'Content-Type': 'application/json',
        'User-Agent': 'OpenClaw-Firecrawl/1.0'
      },
      timeout: REQUEST_TIMEOUT
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`Firecrawl API error: ${res.statusCode} - ${parsed.error || parsed.message || data}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Scrape a single URL using Firecrawl
 */
async function scrapeUrl(url, options = {}) {
  const { formats = ['markdown', 'html'], onlyMainContent = true } = options;
  
  console.log(`  Scraping: ${url}`);
  
  try {
    const response = await firecrawlRequest('/v1/scrape', 'POST', {
      url,
      formats,
      onlyMainContent,
      waitFor: 2000
    });
    
    return {
      success: true,
      url: response.url || url,
      markdown: response.markdown || '',
      html: response.html || '',
      title: response.metadata?.title || null,
      description: response.metadata?.description || null,
      ogImage: response.metadata?.image || null,
      favicon: response.metadata?.icon || null,
      links: response.links || [],
      metadata: response.metadata || {}
    };
  } catch (error) {
    return {
      success: false,
      url,
      error: error.message
    };
  }
}

/**
 * Crawl a website using Firecrawl
 */
async function crawlWebsite(startUrl, options = {}) {
  const { limit = 10, maxDepth = 2 } = options;
  
  console.log(`  Crawling: ${startUrl} (limit: ${limit}, depth: ${maxDepth})`);
  
  try {
    const response = await firecrawlRequest('/v1/crawl', 'POST', {
      url: startUrl,
      limit,
      maxDepth,
      allowBackward: false,
      allowExternalLinks: false
    });
    
    return {
      success: true,
      jobId: response.jobId,
      status: response.status
    };
  } catch (error) {
    return {
      success: false,
      url: startUrl,
      error: error.message
    };
  }
}

/**
 * Get crawl job status
 */
async function getCrawlStatus(jobId) {
  try {
    const response = await firecrawlRequest(`/v1/crawl/${jobId}`, 'GET');
    return response;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Extract structured data using Firecrawl
 */
async function extractData(url, schema) {
  console.log(`  Extracting structured data from: ${url}`);
  
  try {
    const response = await firecrawlRequest('/v1/extract', 'POST', {
      urls: [url],
      schema: typeof schema === 'string' ? JSON.parse(schema) : schema
    });
    
    return {
      success: true,
      data: response.data || [],
      extracted: response.extracted || []
    };
  } catch (error) {
    return {
      success: false,
      url,
      error: error.message
    };
  }
}

/**
 * Map a website structure
 */
async function mapWebsite(url) {
  console.log(`  Mapping: ${url}`);
  
  try {
    const response = await firecrawlRequest('/v1/map', 'POST', {
      url
    });
    
    return {
      success: true,
      links: response.links || [],
      count: response.links?.length || 0
    };
  } catch (error) {
    return {
      success: false,
      url,
      error: error.message
    };
  }
}

/**
 * Process bookmarks from database using Firecrawl
 */
async function processBookmarks(count = BATCH_SIZE) {
  const client = await pool.connect();
  
  try {
    // Fetch alive bookmarks that haven't been scraped yet (or failed)
    const result = await client.query(`
      SELECT id, url, title
      FROM ops.browser_bookmarks
      WHERE status = 'alive'
        AND (scraped_at IS NULL OR content IS NULL)
      ORDER BY checked_at ASC
      LIMIT $1
    `, [count]);

    if (result.rows.length === 0) {
      console.log(`[${new Date().toISOString()}] Firecrawl: No bookmarks to scrape`);
      return;
    }

    console.log(`[${new Date().toISOString()}] Firecrawl: Processing ${result.rows.length} bookmark(s)`);

    for (const bookmark of result.rows) {
      const scrapeResult = await scrapeUrl(bookmark.url);
      
      if (scrapeResult.success) {
        // Update with scraped content
        await client.query(`
          UPDATE ops.browser_bookmarks
          SET 
            content = $1,
            content_type = $2,
            og_image = $3,
            og_description = $4,
            favicon_url = $5,
            scraped_at = NOW()
          WHERE id = $6
        `, [
          scrapeResult.markdown || scrapeResult.html,
          detectContentType(bookmark.url, scrapeResult),
          scrapeResult.ogImage,
          scrapeResult.description,
          scrapeResult.favicon,
          bookmark.id
        ]);

        console.log(`  ✓ #${bookmark.id}: Scraped ${(scrapeResult.markdown || '').length} chars`);
        console.log(`    Title: ${scrapeResult.title || 'N/A'}`);
        console.log(`    Links found: ${scrapeResult.links?.length || 0}`);
      } else {
        console.log(`  ✗ #${bookmark.id}: ${scrapeResult.error}`);
      }
      
      // Rate limiting
      if (result.rows.indexOf(bookmark) < result.rows.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } finally {
    client.release();
  }
  
  await pool.end();
}

/**
 * Detect content type from URL and metadata
 */
function detectContentType(url, data) {
  const hostname = new URL(url).hostname.toLowerCase();
  
  // Check metadata first
  if (data.metadata?.type) return data.metadata.type;
  
  // Social media
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'tweet';
  if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'video';
  if (hostname.includes('github.com') || hostname.includes('gitlab.com')) return 'code';
  if (hostname.includes('stackoverflow.com')) return 'qna';
  if (hostname.includes('reddit.com')) return 'post';
  
  // File types
  if (url.toLowerCase().endsWith('.pdf')) return 'pdf';
  if (url.toLowerCase().endsWith('.doc')) return 'document';
  if (url.toLowerCase().endsWith('.docx')) return 'document';
  
  // Default
  return 'article';
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Firecrawl Scraper - Advanced Web Scraping for OpenClaw

Usage:
  node firecrawl-scraper.mjs [options]

Options:
  --url <url>           Scrape a single URL
  --batch <count>       Process <count> bookmarks from database (default: 5)
  --crawl <url>         Crawl a website starting from <url>
  --limit <count>       Limit pages to crawl (with --crawl)
  --extract <url>       Extract structured data from URL
  --schema <json>       JSON schema for extraction
  --map <url>           Map website structure
  --job-id <id>         Check crawl job status
  --help                Show this help message

Examples:
  # Scrape a single URL
  node firecrawl-scraper.mjs --url "https://example.com"
  
  # Process bookmarks from database
  node firecrawl-scraper.mjs --batch 10
  
  # Crawl a website
  node firecrawl-scraper.mjs --crawl "https://example.com" --limit 20
  
  # Extract structured data
  node firecrawl-scraper.mjs --extract "https://example.com" --schema '{"name": "string", "price": "number"}'
  
  # Map a website
  node firecrawl-scraper.mjs --map "https://example.com"

Environment Variables:
  FIRECRAWL_API_KEY    Your Firecrawl API key (required)

Get your API key from: https://firecrawl.dev
`);
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--url':
        options.url = args[++i];
        break;
      case '--batch':
        options.batch = parseInt(args[++i], 10) || BATCH_SIZE;
        break;
      case '--crawl':
        options.crawl = args[++i];
        break;
      case '--limit':
        options.limit = parseInt(args[++i], 10) || 10;
        break;
      case '--extract':
        options.extract = args[++i];
        break;
      case '--schema':
        options.schema = args[++i];
        break;
      case '--map':
        options.map = args[++i];
        break;
      case '--job-id':
        options.jobId = args[++i];
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }

  try {
    // Check for API key
    getApiKey();
    
    const timestamp = new Date().toISOString();
    
    if (options.url) {
      // Single URL scrape
      console.log(`[${timestamp}] Firecrawl: Scraping single URL`);
      const result = await scrapeUrl(options.url);
      
      if (result.success) {
        console.log('\n✓ Success!');
        console.log(`  Title: ${result.title || 'N/A'}`);
        console.log(`  Description: ${result.description || 'N/A'}`);
        console.log(`  Content length: ${(result.markdown || '').length} chars`);
        console.log(`  Links: ${result.links?.length || 0}`);
        
        if (result.markdown) {
          console.log('\n--- Content Preview ---');
          console.log(result.markdown.slice(0, 1000) + '...\n');
        }
      } else {
        console.error(`\n✗ Error: ${result.error}`);
        process.exit(1);
      }
    } else if (options.batch) {
      // Process from database
      console.log(`[${timestamp}] Firecrawl: Batch processing from database`);
      await processBookmarks(options.batch);
    } else if (options.crawl) {
      // Crawl website
      console.log(`[${timestamp}] Firecrawl: Starting crawl`);
      const result = await crawlWebsite(options.crawl, { limit: options.limit || 10 });
      
      if (result.success) {
        console.log(`\n✓ Crawl started!`);
        console.log(`  Job ID: ${result.jobId}`);
        console.log(`  Status: ${result.status}`);
        console.log(`\nCheck status with: node firecrawl-scraper.mjs --job-id ${result.jobId}`);
      } else {
        console.error(`\n✗ Error: ${result.error}`);
        process.exit(1);
      }
    } else if (options.jobId) {
      // Check crawl status
      console.log(`[${timestamp}] Firecrawl: Checking job status`);
      const result = await getCrawlStatus(options.jobId);
      
      console.log(JSON.stringify(result, null, 2));
    } else if (options.extract) {
      // Extract structured data
      if (!options.schema) {
        console.error('Error: --schema required for extraction');
        process.exit(1);
      }
      
      console.log(`[${timestamp}] Firecrawl: Extracting structured data`);
      const result = await extractData(options.extract, options.schema);
      
      if (result.success) {
        console.log('\n✓ Success!');
        console.log(JSON.stringify(result.data || result.extracted, null, 2));
      } else {
        console.error(`\n✗ Error: ${result.error}`);
        process.exit(1);
      }
    } else if (options.map) {
      // Map website
      console.log(`[${timestamp}] Firecrawl: Mapping website`);
      const result = await mapWebsite(options.map);
      
      if (result.success) {
        console.log('\n✓ Success!');
        console.log(`  Links found: ${result.count}`);
        console.log('\n--- Links ---');
        (result.links || []).slice(0, 20).forEach(link => console.log(`  ${link}`));
        if (result.count > 20) {
          console.log(`  ... and ${result.count - 20} more`);
        }
      } else {
        console.error(`\n✗ Error: ${result.error}`);
        process.exit(1);
      }
    } else {
      showHelp();
    }
    
  } catch (error) {
    console.error(`\n✗ Error: ${error.message}`);
    if (error.message.includes('FIRECRWAL_API_KEY')) {
      console.log('\nGet your API key from: https://firecrawl.dev');
      console.log('Then set it with: export FIRECRAWL_API_KEY=fc-xxxxx');
    }
    process.exit(1);
  }
  
  await pool.end();
}

// Run if executed directly
main();
