"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

interface BrowserBookmark {
  id: number;
  url: string;
  title: string | null;
  folder_path: string | null;
  added_at: string | null;
  imported_at: string;
  status: string;
  http_code: number | null;
  checked_at: string | null;
  scraped_at: string | null;
  content_type: string | null;
  summary: string | null;
  summarized_at: string | null;
  summary_model: string | null;
}

interface Stats {
  total: number;
  pending: number;
  alive: number;
  dead: number;
  redirect: number;
  error: number;
  summarized: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function BrowserBookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BrowserBookmark[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, pages: 0 });
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchBookmarks();
  }, [pagination.page, statusFilter]);

  const fetchBookmarks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (statusFilter) params.append("status", statusFilter);

      const res = await fetch(`/api/browser-bookmarks?${params.toString()}`);
      const data = await res.json();
      
      setBookmarks(data.bookmarks || []);
      setStats(data.stats || null);
      setPagination(data.pagination || { page: 1, limit: 25, total: 0, pages: 0 });
    } catch (error) {
      console.error("Failed to fetch browser bookmarks", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination({ ...pagination, page: newPage });
    window.scrollTo(0, 0);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "⏳ Pending" },
      alive: { variant: "default", label: "✓ Alive" },
      dead: { variant: "destructive", label: "✗ Dead" },
      redirect: { variant: "outline", label: "→ Redirect" },
      error: { variant: "destructive", label: "⚠ Error" },
    };
    const config = variants[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Browser Bookmarks" 
        subtitle="Imported bookmarks from Chrome/Firefox exports"
      />

      {/* Stats Overview */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Status</CardTitle>
            <CardDescription>Import and processing progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button 
                variant={statusFilter === "" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("")}
              >
                All: {stats.total}
              </Button>
              <Button 
                variant={statusFilter === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("pending")}
              >
                ⏳ Pending: {stats.pending}
              </Button>
              <Button 
                variant={statusFilter === "alive" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("alive")}
                className={statusFilter === "alive" ? "bg-green-600" : ""}
              >
                ✓ Alive: {stats.alive}
              </Button>
              {stats.dead > 0 && (
                <Button 
                  variant={statusFilter === "dead" ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("dead")}
                >
                  ✗ Dead: {stats.dead}
                </Button>
              )}
              <Badge variant="outline" className="px-3 py-1 border-cyan-500 text-cyan-500">
                📝 Summarized: {stats.summarized} / {stats.alive}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bookmarks List */}
      <Card>
        <CardHeader>
          <CardTitle>Imported Bookmarks</CardTitle>
          <CardDescription>
            {pagination.total} bookmark{pagination.total !== 1 ? 's' : ''} imported
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading bookmarks...
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No bookmarks found. Import bookmarks from Settings → Browser Bookmarks.
            </div>
          ) : (
            <div className="space-y-3">
              {bookmarks.map((bookmark) => (
                <div 
                  key={bookmark.id} 
                  className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <a 
                          href={bookmark.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-cyan-400 hover:text-cyan-300 truncate flex items-center gap-1"
                        >
                          {bookmark.title || new URL(bookmark.url).hostname}
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mb-2">
                        {bookmark.url}
                      </p>
                      {bookmark.summary && (
                        <p className="text-sm text-gray-300 mt-2 line-clamp-2">
                          {bookmark.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        {bookmark.folder_path && (
                          <span>📁 {bookmark.folder_path}</span>
                        )}
                        {bookmark.content_type && (
                          <Badge variant="outline" className="text-xs">
                            {bookmark.content_type}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {getStatusBadge(bookmark.status)}
                      {bookmark.http_code && (
                        <span className="text-xs text-muted-foreground">
                          HTTP {bookmark.http_code}
                        </span>
                      )}
                      {bookmark.summarized_at && (
                        <Badge variant="outline" className="text-xs border-cyan-500 text-cyan-500">
                          ✓ Summarized
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && bookmarks.length > 0 && (
            <div className="flex items-center justify-center mt-6 space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.pages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
