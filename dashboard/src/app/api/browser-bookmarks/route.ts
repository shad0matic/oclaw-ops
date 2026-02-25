import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { JSDOM } from "jsdom";

// Type definitions for browser bookmark exports
interface ChromeBookmark {
  type: 'url' | 'folder';
  name: string;
  url?: string;
  date_added?: string;
  children?: ChromeBookmark[];
}

interface FirefoxBookmark {
  type: 'text/x-moz-place' | 'text/x-moz-place-container';
  title?: string;
  uri?: string;
  dateAdded?: number;
  children?: FirefoxBookmark[];
}

interface ParsedBookmark {
  url: string;
  title: string | null;
  folderPath: string;
  addedAt: Date | null;
}

// Parse Chrome bookmark format recursively
function parseChromeBookmarks(
  node: ChromeBookmark,
  path: string[] = []
): ParsedBookmark[] {
  const results: ParsedBookmark[] = [];

  if (node.type === 'url' && node.url) {
    // Chrome stores date_added as Windows FileTime (100ns intervals since 1601)
    let addedAt: Date | null = null;
    if (node.date_added) {
      const chromeEpoch = BigInt(node.date_added);
      // Convert from Chrome epoch (microseconds since 1601-01-01) to Unix timestamp
      const unixMicro = chromeEpoch - BigInt(11644473600000000);
      addedAt = new Date(Number(unixMicro / BigInt(1000)));
    }

    results.push({
      url: node.url,
      title: node.name || null,
      folderPath: path.join(' > '),
      addedAt,
    });
  } else if (node.children) {
    const newPath = node.name ? [...path, node.name] : path;
    for (const child of node.children) {
      results.push(...parseChromeBookmarks(child, newPath));
    }
  }

  return results;
}

// Parse Firefox bookmark format recursively
function parseFirefoxBookmarks(
  node: FirefoxBookmark,
  path: string[] = []
): ParsedBookmark[] {
  const results: ParsedBookmark[] = [];

  if (node.type === 'text/x-moz-place' && node.uri) {
    // Firefox stores dateAdded as microseconds since Unix epoch
    let addedAt: Date | null = null;
    if (node.dateAdded) {
      addedAt = new Date(node.dateAdded / 1000);
    }

    results.push({
      url: node.uri,
      title: node.title || null,
      folderPath: path.join(' > '),
      addedAt,
    });
  } else if (node.children) {
    const newPath = node.title ? [...path, node.title] : path;
    for (const child of node.children) {
      results.push(...parseFirefoxBookmarks(child, newPath));
    }
  }

  return results;
}

// Parse HTML bookmarks (Netscape Bookmark File Format - Brave, Safari, Edge)
function parseHTMLBookmarks(html: string): ParsedBookmark[] {
  const results: ParsedBookmark[] = [];
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    function traverse(element: Element, path: string[]): void {
      const children = Array.from(element.children);
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.tagName !== 'DT') continue;

        const anchor = child.querySelector('a');
        if (anchor) {
          const url = anchor.getAttribute('href');
          if (url && (url.startsWith('http') || url.startsWith('https'))) {
            const title = anchor.textContent?.trim() || null;
            const addDate = anchor.getAttribute('add_date');
            let addedAt: Date | null = null;
            if (addDate) {
              addedAt = new Date(parseInt(addDate, 10) * 1000);
            }
            results.push({ url, title, folderPath: path.join(' > '), addedAt });
          }
        }

        const header = child.querySelector('h3');
        if (header) {
          const folderName = header.textContent?.trim();
          if (folderName) {
            const newPath = [...path, folderName];
            const nextElement = children[i + 1];
            if (nextElement && nextElement.tagName === 'DL') {
              traverse(nextElement, newPath);
            }
          }
        }
      }
    }

    const rootDL = document.querySelector('dl');
    if (rootDL) {
      traverse(rootDL, []);
    }
  } catch (error) {
    console.error('HTML parsing error:', error);
    throw new Error('Failed to parse HTML bookmark file');
  }
  return results;
}

// Detect format and parse bookmarks
function parseBookmarkFile(data: unknown): ParsedBookmark[] {
  // HTML format detection (Brave, Safari, Edge - Netscape Bookmark File Format)
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (
      trimmed.includes('<!DOCTYPE NETSCAPE-Bookmark-file-1>') ||
      trimmed.includes('<DT><H3') ||
      (trimmed.toLowerCase().includes('<html') && trimmed.toLowerCase().includes('<a href'))
    ) {
      return parseHTMLBookmarks(data);
    }
  }

  // Chrome format detection: has "roots" object with bookmark_bar, other, synced
  if (
    typeof data === 'object' &&
    data !== null &&
    'roots' in data &&
    typeof (data as { roots: unknown }).roots === 'object'
  ) {
    const roots = (data as { roots: Record<string, ChromeBookmark> }).roots;
    const results: ParsedBookmark[] = [];
    
    for (const [rootName, rootNode] of Object.entries(roots)) {
      if (rootNode && typeof rootNode === 'object') {
        results.push(...parseChromeBookmarks(rootNode, [rootName]));
      }
    }
    return results;
  }

  // Firefox format detection: root has type "text/x-moz-place-container"
  if (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    (data as FirefoxBookmark).type === 'text/x-moz-place-container'
  ) {
    return parseFirefoxBookmarks(data as FirefoxBookmark);
  }

  // Generic array of URLs (fallback)
  if (Array.isArray(data)) {
    return data
      .filter((item: unknown) => typeof item === 'string' && item.startsWith('http'))
      .map((url: string) => ({
        url,
        title: null,
        folderPath: '',
        addedAt: null,
      }));
  }

  throw new Error('Unrecognized bookmark format. Supported formats: HTML (Brave/Safari/Edge), Chrome JSON, Firefox JSON');
}

// GET /api/browser-bookmarks - Fetch imported bookmarks with stats
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = (page - 1) * limit;
    const status = searchParams.get("status") || "";

    // Get stats
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'alive') as alive,
        COUNT(*) FILTER (WHERE status = 'dead') as dead,
        COUNT(*) FILTER (WHERE status = 'redirect') as redirect,
        COUNT(*) FILTER (WHERE status = 'error') as error,
        COUNT(*) FILTER (WHERE summary IS NOT NULL) as summarized
      FROM ops.browser_bookmarks
    `);
    const stats = statsResult.rows[0];

    // Build query
    let query = `SELECT * FROM ops.browser_bookmarks`;
    const params: (string | number)[] = [];

    if (status) {
      query += ` WHERE status = $1`;
      params.push(status);
    }

    query += ` ORDER BY imported_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows: bookmarks } = await pool.query(query, params);

    // Get total for pagination
    let countQuery = `SELECT COUNT(*) FROM ops.browser_bookmarks`;
    const countParams: string[] = [];
    if (status) {
      countQuery += ` WHERE status = $1`;
      countParams.push(status);
    }
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count, 10);

    return NextResponse.json({
      bookmarks,
      stats: {
        total: parseInt(stats.total, 10),
        pending: parseInt(stats.pending, 10),
        alive: parseInt(stats.alive, 10),
        dead: parseInt(stats.dead, 10),
        redirect: parseInt(stats.redirect, 10),
        error: parseInt(stats.error, 10),
        summarized: parseInt(stats.summarized, 10),
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching browser bookmarks:", error);
    return NextResponse.json(
      { error: "Failed to fetch browser bookmarks" },
      { status: 500 }
    );
  }
}

// POST /api/browser-bookmarks - Parse and preview OR import bookmarks
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (action === 'parse') {
      // Parse and return preview without importing
      const bookmarks = parseBookmarkFile(data);
      
      // Filter out invalid URLs and internal browser pages
      const validBookmarks = bookmarks.filter(b => {
        try {
          const url = new URL(b.url);
          return ['http:', 'https:'].includes(url.protocol) &&
                 !b.url.startsWith('chrome://') &&
                 !b.url.startsWith('about:') &&
                 !b.url.startsWith('javascript:');
        } catch {
          return false;
        }
      });

      // Get folder distribution
      const folderCounts: Record<string, number> = {};
      for (const b of validBookmarks) {
        const folder = b.folderPath || '(root)';
        folderCounts[folder] = (folderCounts[folder] || 0) + 1;
      }

      return NextResponse.json({
        success: true,
        preview: {
          total: validBookmarks.length,
          sample: validBookmarks.slice(0, 10),
          folderDistribution: Object.entries(folderCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([folder, count]) => ({ folder, count })),
        },
        bookmarks: validBookmarks,
      });
    }

    if (action === 'import') {
      // Import bookmarks to database
      const bookmarks: ParsedBookmark[] = body.bookmarks;
      
      if (!bookmarks || !Array.isArray(bookmarks)) {
        return NextResponse.json(
          { error: 'No bookmarks provided' },
          { status: 400 }
        );
      }

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const bookmark of bookmarks) {
        try {
          await pool.query(
            `INSERT INTO ops.browser_bookmarks (url, title, folder_path, added_at)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (url) DO NOTHING`,
            [bookmark.url, bookmark.title, bookmark.folderPath, bookmark.addedAt]
          );
          const result = await pool.query('SELECT lastval() IS NOT NULL as inserted');
          // Check if row was actually inserted
          const checkResult = await pool.query(
            'SELECT 1 FROM ops.browser_bookmarks WHERE url = $1 AND imported_at > NOW() - INTERVAL \'5 seconds\'',
            [bookmark.url]
          );
          if (checkResult.rows.length > 0) {
            imported++;
          } else {
            skipped++; // URL already existed
          }
        } catch (error) {
          skipped++;
          if (errors.length < 5) {
            errors.push(`${bookmark.url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      return NextResponse.json({
        success: true,
        imported,
        skipped,
        total: bookmarks.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "parse" or "import".' },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error processing bookmarks:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process bookmarks" },
      { status: 500 }
    );
  }
}
