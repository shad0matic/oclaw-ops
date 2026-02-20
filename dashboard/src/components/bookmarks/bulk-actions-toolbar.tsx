"use client";

import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

interface BulkActionsToolbarProps {
  selectedCount: number;
  selectedIds: Set<string>;
  onClearSelection: () => void;
  onBulkComplete: () => void;
}

export function BulkActionsToolbar({
  selectedCount,
  selectedIds,
  onClearSelection,
  onBulkComplete,
}: BulkActionsToolbarProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch(`/api/bookmark-categories`);
        const data = await res.json();
        setCategories(data);
      } catch (error) {
        console.error("Failed to fetch categories", error);
      }
    }
    fetchCategories();
  }, []);

  const handleBulkMove = async (categorySlug: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/x-bookmarks/bulk`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action: "move",
          category_id: categorySlug,
        }),
      });

      if (res.ok) {
        onBulkComplete();
        onClearSelection();
      } else {
        console.error("Bulk move failed");
      }
    } catch (error) {
      console.error("Error during bulk move:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/x-bookmarks/bulk`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
        }),
      });

      if (res.ok) {
        onBulkComplete();
        onClearSelection();
      } else {
        console.error("Bulk delete failed");
      }
    } catch (error) {
      console.error("Error during bulk delete:", error);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleMarkProcessed = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/x-bookmarks/bulk`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          action: "update",
          fields: { processed: true },
        }),
      });

      if (res.ok) {
        onBulkComplete();
        onClearSelection();
      } else {
        console.error("Bulk mark processed failed");
      }
    } catch (error) {
      console.error("Error during bulk mark processed:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderCategoryOptions = (cat: any, level: number = 0) => {
    const indent = '  '.repeat(level);
    const options = [
      <SelectItem key={cat.slug} value={cat.slug}>
        {indent}{cat.name}
      </SelectItem>
    ];
    if (cat.children && cat.children.length > 0) {
      cat.children.forEach((child: any) => {
        options.push(...renderCategoryOptions(child, level + 1));
      });
    }
    return options;
  };

  return (
    <>
      <div className="bg-primary/10 border-b border-border p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <span className="font-medium">☑ {selectedCount} selected</span>
          
          <Select onValueChange={handleBulkMove} disabled={loading}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="📁 Move to..." />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => renderCategoryOptions(cat))}
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowDeleteConfirm(true)}
            disabled={loading}
          >
            🗑️ Delete
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleMarkProcessed}
            disabled={loading}
          >
            ✓ Mark processed
          </Button>
        </div>

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClearSelection}
          disabled={loading}
        >
          ✕ Clear
        </Button>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} bookmark{selectedCount > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected bookmarks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
