"use client"

import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Upload, FileJson, CheckCircle2, AlertCircle, Loader2, FolderTree, ExternalLink } from "lucide-react"
import { toast } from "sonner"

interface ParsedBookmark {
  url: string;
  title: string | null;
  folderPath: string;
  addedAt: Date | null;
}

interface PreviewData {
  total: number;
  sample: ParsedBookmark[];
  folderDistribution: { folder: string; count: number }[];
}

interface ImportStats {
  total: number;
  pending: number;
  alive: number;
  dead: number;
  redirect: number;
  error: number;
  summarized: number;
}

type ImportState = 'idle' | 'parsing' | 'preview' | 'importing' | 'done';

export function BrowserBookmarkImport() {
  const [state, setState] = useState<ImportState>('idle');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [bookmarks, setBookmarks] = useState<ParsedBookmark[]>([]);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/browser-bookmarks?limit=1');
      const data = await response.json();
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // Initial fetch
  useState(() => {
    fetchStats();
  });

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setState('parsing');
    setError(null);
    setPreview(null);
    setBookmarks([]);
    setImportResult(null);

    try {
      const text = await file.text();
      let data: unknown;
      
      try {
        data = JSON.parse(text);
      } catch {
        setError('Invalid JSON file. Please upload a valid bookmark export.');
        setState('idle');
        return;
      }

      // Send to API for parsing
      const response = await fetch('/api/browser-bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'parse', data }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to parse bookmarks');
      }

      setPreview(result.preview);
      setBookmarks(result.bookmarks);
      setState('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse bookmark file');
      setState('idle');
    }

    // Reset file input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (bookmarks.length === 0) return;

    setState('importing');
    setError(null);

    try {
      const response = await fetch('/api/browser-bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', bookmarks }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import bookmarks');
      }

      setImportResult({ imported: result.imported, skipped: result.skipped });
      setState('done');
      fetchStats();
      toast.success(`Imported ${result.imported} bookmarks`, {
        description: result.skipped > 0 ? `${result.skipped} duplicates skipped` : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import bookmarks');
      setState('preview');
    }
  }, [bookmarks, fetchStats]);

  const handleReset = useCallback(() => {
    setState('idle');
    setPreview(null);
    setBookmarks([]);
    setImportResult(null);
    setError(null);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="h-5 w-5" />
          Browser Bookmark Import
        </CardTitle>
        <CardDescription>
          Import bookmarks from Chrome or Firefox. Exported bookmarks will be validated, scraped, and summarized.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Stats */}
        {stats && stats.total > 0 && (
          <div className="flex flex-wrap gap-2 pb-4 border-b">
            <Badge variant="outline" className="gap-1">
              Total: {stats.total}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              ⏳ Pending: {stats.pending}
            </Badge>
            <Badge variant="default" className="gap-1 bg-green-600">
              ✓ Alive: {stats.alive}
            </Badge>
            {stats.dead > 0 && (
              <Badge variant="destructive" className="gap-1">
                ✗ Dead: {stats.dead}
              </Badge>
            )}
            {stats.summarized > 0 && (
              <Badge variant="outline" className="gap-1 border-cyan-500 text-cyan-500">
                📝 Summarized: {stats.summarized}
              </Badge>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-500/10 rounded-md">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Upload Zone */}
        {(state === 'idle' || state === 'parsing') && (
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={state === 'parsing'}
            />
            <div className={`flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-lg transition-colors ${
              state === 'parsing' ? 'border-cyan-500 bg-cyan-500/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}>
              {state === 'parsing' ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                  <p className="text-sm text-muted-foreground">Parsing bookmarks...</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Drop bookmark JSON here or click to select</p>
                  <p className="text-xs text-muted-foreground">
                    Supports Chrome (<code>Bookmarks</code>) and Firefox (<code>bookmarks.json</code>) exports
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* How to Export Guide */}
        {state === 'idle' && (
          <div className="text-xs text-muted-foreground space-y-1 mt-2">
            <p className="font-medium">How to export bookmarks:</p>
            <p>• <strong>Chrome:</strong> Navigate to <code className="bg-muted px-1 rounded">chrome://bookmarks</code> → ⋮ menu → Export bookmarks</p>
            <p>• <strong>Firefox:</strong> Bookmarks → Manage Bookmarks → Import and Backup → Backup</p>
          </div>
        )}

        {/* Preview */}
        {state === 'preview' && preview && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              Found {preview.total} valid bookmarks
            </div>

            {/* Folder Distribution */}
            {preview.folderDistribution.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FolderTree className="h-4 w-4" />
                  Top Folders
                </div>
                <div className="flex flex-wrap gap-1">
                  {preview.folderDistribution.map(({ folder, count }) => (
                    <Badge key={folder} variant="secondary" className="text-xs">
                      {folder}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Sample Preview */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Sample bookmarks:</p>
              <div className="max-h-48 overflow-y-auto space-y-1 text-xs">
                {preview.sample.map((bookmark, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="font-medium truncate flex-1">
                      {bookmark.title || new URL(bookmark.url).hostname}
                    </span>
                    {bookmark.folderPath && (
                      <span className="text-muted-foreground truncate max-w-[200px]">
                        {bookmark.folderPath}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Importing State */}
        {state === 'importing' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-cyan-500" />
              <span>Importing {bookmarks.length} bookmarks...</span>
            </div>
            <Progress value={50} className="h-2" />
          </div>
        )}

        {/* Done State */}
        {state === 'done' && importResult && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-lg font-semibold text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              Import Complete
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-green-400">✓ Imported: {importResult.imported}</span>
              {importResult.skipped > 0 && (
                <span className="text-muted-foreground">Skipped (duplicates): {importResult.skipped}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Bookmarks are now queued for validation and summarization. This happens in the background.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {state === 'preview' && (
          <>
            <Button variant="outline" onClick={handleReset}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={bookmarks.length === 0}>
              Import {bookmarks.length} Bookmarks
            </Button>
          </>
        )}
        {state === 'done' && (
          <Button variant="outline" onClick={handleReset}>
            Import More
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
