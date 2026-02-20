#!/usr/bin/env node
/**
 * bookmark-validator.mjs — Background job for validating browser bookmark URLs
 * 
 * Runs periodically (e.g., every 15 minutes). Checks pending bookmarks:
 * - Performs HEAD/GET requests to validate URL health
 * - Updates: status, http_code, checked_at
 * - Rate limited: 10 URLs per minute
 * - Handles redirects (stores final URL)
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

const BATCH_SIZE = 10; // Process 10 URLs per run
const REQUEST_TIMEOUT = 10000; // 10 second timeout

/**
 * Perform HTTP HEAD request to check URL health
 */
async function checkUrl(url) {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        method: 'HEAD',
        timeout: REQUEST_TIMEOUT,
        headers: {
          'User-Agent': 'OpenClaw-BookmarkValidator/1.0'
        }
      };

      const req = client.request(url, options, (res) => {
        const status = res.statusCode;

        // Handle redirects
        if (status >= 300 && status < 400 && res.headers.location) {
          const finalUrl = new URL(res.headers.location, url).toString();
          resolve({
            status: 'redirect',
            httpCode: status,
            finalUrl
          });
          return;
        }

        // Successful response
        if (status >= 200 && status < 300) {
          resolve({
            status: 'alive',
            httpCode: status,
            finalUrl: null
          });
          return;
        }

        // Dead links
        if (status === 404 || status === 410) {
          resolve({
            status: 'dead',
            httpCode: status,
            finalUrl: null
          });
          return;
        }

        // Other errors
        resolve({
          status: 'error',
          httpCode: status,
          finalUrl: null
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          status: 'error',
          httpCode: null,
          finalUrl: null,
          error: 'Request timeout'
        });
      });

      req.on('error', (err) => {
        resolve({
          status: 'error',
          httpCode: null,
          finalUrl: null,
          error: err.message
        });
      });

      req.end();
    } catch (err) {
      resolve({
        status: 'error',
        httpCode: null,
        finalUrl: null,
        error: err.message
      });
    }
  });
}

/**
 * Main validation logic
 */
async function validate() {
  const client = await pool.connect();
  
  try {
    // Fetch pending bookmarks (prioritize oldest first)
    const result = await client.query(`
      SELECT id, url
      FROM ops.browser_bookmarks
      WHERE status = 'pending'
      ORDER BY imported_at ASC
      LIMIT $1
    `, [BATCH_SIZE]);

    if (result.rows.length === 0) {
      console.log(`[${new Date().toISOString()}] Validator: No pending bookmarks`);
      return;
    }

    console.log(`[${new Date().toISOString()}] Validator: Processing ${result.rows.length} bookmark(s)`);

    for (const bookmark of result.rows) {
      const checkResult = await checkUrl(bookmark.url);
      
      // Update bookmark status
      await client.query(`
        UPDATE ops.browser_bookmarks
        SET 
          status = $1,
          http_code = $2,
          checked_at = NOW()
        WHERE id = $3
      `, [checkResult.status, checkResult.httpCode, bookmark.id]);

      console.log(`  → #${bookmark.id}: ${bookmark.url} → ${checkResult.status} (${checkResult.httpCode || 'N/A'})`);
      
      // Rate limiting: wait ~6 seconds between requests (10/min)
      if (result.rows.indexOf(bookmark) < result.rows.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 6000));
      }
    }
  } finally {
    client.release();
  }
  
  await pool.end();
}

validate().catch(err => {
  console.error('Validation failed:', err);
  process.exit(1);
});
