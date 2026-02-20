"use client";

import { useState, useEffect } from "react";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { CategorySidebar } from "../../../components/bookmarks/category-sidebar";
import { BookmarkCard } from "../../../components/bookmarks/bookmark-card";
import { CategoryChat } from "../../../components/bookmarks/category-chat";
import { FolderContextBar } from "../../../components/bookmarks/folder-context-bar";
import { BulkActionsToolbar } from "../../../components/bookmarks/bulk-actions-toolbar";
import AutoCategorizeModal from "../../../components/bookmarks/auto-categorize-modal";

interface Bookmark {
  id: string;
  author: string;
  text: string;
  created_at: string;
  category: string;
  url: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, pages: 0 });
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedXFolder, setSelectedXFolder] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  
  // Auto-categorize state
  const [uncategorizedCount, setUncategorizedCount] = useState<number>(0);
  const [showAutoCategorizeModal, setShowAutoCategorizeModal] = useState<boolean>(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch bookmarks based on filters
  useEffect(() => {
    fetchBookmarks();
  }, [pagination.page, selectedCategory, selectedXFolder, debouncedSearch]);

  const handlePageChange = (newPage: number) => {
    setPagination({ ...pagination, page: newPage });
    window.scrollTo(0, 0);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setSelectedXFolder("");
    setPagination({ ...pagination, page: 1 });
  };

  const handleXFolderSelect = (folder: string) => {
    setSelectedXFolder(folder);
    setSelectedCategory("");
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      if (next.size === 0) {
        setSelectionMode(false);
      } else {
        setSelectionMode(true);
      }
      return next;
    });
  };

  const selectAll = () => {
    const allIds = new Set(bookmarks.map(b => b.id));
    setSelectedIds(allIds);
    setSelectionMode(true);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handleBulkComplete = () => {
    // Refetch bookmarks after bulk operation
    fetchBookmarks();
  };

  const fetchBookmarks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (selectedCategory) params.append("category", selectedCategory);
      if (selectedXFolder) params.append("x_folder", selectedXFolder);
      if (debouncedSearch) params.append("search", debouncedSearch);

      const res = await fetch(`/api/bookmarks?${params.toString()}`);
      const data = await res.json();
      setBookmarks(data.bookmarks || []);
      setPagination(data.pagination || { page: 1, limit: 25, total: 0, pages: 0 });
    } catch (error) {
      console.error("Failed to fetch bookmarks", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUncategorizedCount = async () => {
    try {
      const params = new URLSearchParams({ category: "", limit: "1" });
      const res = await fetch(`/api/bookmarks?${params.toString()}`);
      const data = await res.json();
      setUncategorizedCount(data.pagination?.total || 0);
    } catch (error) {
      console.error("Failed to fetch uncategorized count", error);
    }
  };

  useEffect(() => {
    fetchUncategorizedCount();
  }, []);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar with categories */}
      <div className="w-64 border-r border-border hidden md:block">
        <CategorySidebar 
          selectedCategory={selectedCategory} 
          onSelectCategory={handleCategorySelect}
          selectedXFolder={selectedXFolder}
          onSelectXFolder={handleXFolderSelect}
        />
      </div>
      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Bookmarks content */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-border">
          {/* Folder context bar - shows when X folder is selected */}
          {selectedXFolder && (
            <FolderContextBar 
              folderName={selectedXFolder}
              bookmarkCount={pagination.total}
              onClear={() => handleXFolderSelect("")}
            />
          )}
          {/* Bulk actions toolbar */}
          {selectionMode && selectedIds.size > 0 && (
            <BulkActionsToolbar
              selectedCount={selectedIds.size}
              selectedIds={selectedIds}
              onClearSelection={clearSelection}
              onBulkComplete={handleBulkComplete}
            />
          )}
          
          {/* Search bar */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-lg">
                <Input
                  placeholder="Search bookmarks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full"
                />
              </div>
              {uncategorizedCount > 0 && !selectedCategory && (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => setShowAutoCategorizeModal(true)}
                  className="whitespace-nowrap"
                >
                  🤖 Auto-Categorize ({uncategorizedCount})
                </Button>
              )}
              {bookmarks.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={selectedIds.size === bookmarks.length ? clearSelection : selectAll}
                >
                  {selectedIds.size === bookmarks.length ? "Deselect All" : "Select All"}
                </Button>
              )}
            </div>
          </div>
          {/* Bookmarks list */}
          <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">Loading bookmarks...</div>
          ) : bookmarks.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No bookmarks found.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
              {bookmarks.map((bookmark) => (
                <BookmarkCard 
                  key={bookmark.id} 
                  bookmark={bookmark}
                  selectionMode={selectionMode}
                  isSelected={selectedIds.has(bookmark.id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
          )}
          {/* Pagination */}
          {!loading && bookmarks.length > 0 && (
            <div className="flex items-center justify-center mt-6 space-x-2">
              <Button
                variant="outline"
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
                disabled={pagination.page === pagination.pages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
        </div>
        {/* Chat for selected category */}
        {selectedCategory && (
          <div className="w-96 hidden lg:block">
            <CategoryChat category={selectedCategory} currentUser="currentUser" />
          </div>
        )}
      </div>

      {/* Auto-Categorize Modal */}
      <AutoCategorizeModal
        open={showAutoCategorizeModal}
        onOpenChange={setShowAutoCategorizeModal}
        uncategorizedCount={uncategorizedCount}
        selectedBookmarkIds={[]}
        onApply={() => {
          fetchBookmarks();
          fetchUncategorizedCount();
        }}
      />
    </div>
  );
}
