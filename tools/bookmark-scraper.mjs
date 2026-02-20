#!/usr/bin/env node
/**
 * bookmark-scraper.mjs — Background job for scraping browser bookmark content
 * 
 * Runs periodically after validation. Processes 'alive' bookmarks:
 * - Uses readability-style content extraction
 * - Detects content type (article, video, tweet, PDF, etc.)
 * - Rate limited: 5 URLs per minute
 * - Stores: content, content_type, scraped_at
 */

import pg from 'pg';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

const pool = new pg.Pool({
  database: process.env.PGDATABASE || 'openclaw_db',
  user: process.env.PGUSER || 'openclaw',
  host: '/var/run/postgresql'
});

const BATCH_SIZE = 5; // Process 5 URLs per run
const REQUEST_TIMEOUT = 15000; // 15 second timeout

/**
 * Detect content type from URL and metadata
 */
function detectContentType(url, dom) {
  const hostname = new URL(url).hostname.toLowerCase();
  
  // Social media patterns
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    return 'tweet';
  }
  if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
    return 'video';
  }
  if (hostname.includes('github.com')) {
    return 'code';
  }
  
  // Check meta tags
  const doc = dom.window.document;
  const ogType = doc.querySelector('meta[property="og:type"]')?.content;
  if (ogType === 'article') return 'article';
  if (ogType === 'video') return 'video';
  
  // PDF check
  if (url.toLowerCase().endsWith('.pdf')) {
    return 'pdf';
  }
  
  // Default to article for web pages
  return 'article';
}

/**
 * Extract Open Graph metadata
 */
function extractMetadata(dom) {
  const doc = dom.window.document;
  
  return {
    ogImage: doc.querySelector('meta[property="og:image"]')?.content || null,
    ogDescription: doc.querySelector('meta[property="og:description"]')?.content || 
                   doc.querySelector('meta[name="description"]')?.content || null,
    faviconUrl: doc.querySelector('link[rel="icon"]')?.href ||
                doc.querySelector('link[rel="shortcut icon"]')?.href || null
  };
}

/**
 * Fetch and extract content from URL
 */
async function scrapeUrl(url) {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        method: 'GET',
        timeout: REQUEST_TIMEOUT,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OpenClaw-BookmarkScraper/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      };

      const req = client.request(url, options, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          resolve({ success: false, error: `HTTP ${res.statusCode}` });
          return;
        }

        let html = '';
        res.setEncoding('utf8');
        res.on('data', chunk => html += chunk);
        res.on('end', () => {
          try {
            // Parse with JSDOM
            const dom = new JSDOM(html, { url });
            
            // Extract readable content with Readability
            const reader = new Readability(dom.window.document);
            const article = reader.parse();
            
            if (!article) {
              resolve({ 
                success: false, 
                error: 'No readable content found' 
              });
              return;
            }

            // Detect content type
            const contentType = detectContentType(url, dom);
            
            // Extract metadata
            const metadata = extractMetadata(dom);

            resolve({
              success: true,
              content: article.textContent,
              contentType,
              ...metadata
            });
          } catch (err) {
            resolve({ 
              success: false, 
              error: `Parse error: ${err.message}` 
            });
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'Request timeout' });
      });

      req.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      req.end();
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
}

/**
 * Main scraping logic
 */
async function scrape() {
  const client = await pool.connect();
  
  try {
    // Fetch alive bookmarks that haven't been scraped yet
    const result = await client.query(`
      SELECT id, url
      FROM ops.browser_bookmarks
      WHERE status = 'alive'
        AND scraped_at IS NULL
      ORDER BY checked_at ASC
      LIMIT $1
    `, [BATCH_SIZE]);

    if (result.rows.length === 0) {
      console.log(`[${new Date().toISOString()}] Scraper: No bookmarks to scrape`);
      return;
    }

    console.log(`[${new Date().toISOString()}] Scraper: Processing ${result.rows.length} bookmark(s)`);

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
          scrapeResult.content,
          scrapeResult.contentType,
          scrapeResult.ogImage,
          scrapeResult.ogDescription,
          scrapeResult.faviconUrl,
          bookmark.id
        ]);

        console.log(`  ✓ #${bookmark.id}: Scraped ${scrapeResult.content?.length || 0} chars (${scrapeResult.contentType})`);
      } else {
        // Mark as scraped but with no content
        await client.query(`
          UPDATE ops.browser_bookmarks
          SET scraped_at = NOW()
          WHERE id = $1
        `, [bookmark.id]);
        
        console.log(`  ✗ #${bookmark.id}: ${scrapeResult.error}`);
      }
      
      // Rate limiting: wait ~12 seconds between requests (5/min)
      if (result.rows.indexOf(bookmark) < result.rows.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 12000));
      }
    }
  } finally {
    client.release();
  }
  
  await pool.end();
}

scrape().catch(err => {
  console.error('Scraping failed:', err);
  process.exit(1);
});
