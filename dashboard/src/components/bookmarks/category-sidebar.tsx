import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { ChevronDown, ChevronRight, FolderOpen, Twitter, RefreshCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { toast } from "sonner";

interface Category {
  id: number;
  name: string;
  slug: string;
  emoji?: string;
  total_count: number;
  children: Category[];
}

interface XFolder {
  x_folder: string;
  bookmark_count: string;
}

interface FolderMapping {
  x_folder: string;
  description: string | null;
}

interface CategorySidebarProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  selectedXFolder?: string;
  onSelectXFolder?: (folder: string) => void;
}

export function CategorySidebar({ 
  selectedCategory, 
  onSelectCategory,
  selectedXFolder,
  onSelectXFolder 
}: CategorySidebarProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [xFolders, setXFolders] = useState<XFolder[]>([]);
  const [folderMappings, setFolderMappings] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [xFoldersExpanded, setXFoldersExpanded] = useState(true);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [fetching, setFetching] = useState(false);

  const handleFetchBookmarks = async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/x-bookmarks/fetch", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Fetched ${data.fetched || 0} new bookmarks`, {
          description: data.message || "Sync complete"
        });
        // Refresh folders list
        const xRes = await fetch("/api/x-folders");
        const xData = await xRes.json();
        setXFolders(Array.isArray(xData) ? xData : []);
      } else {
        toast.error("Fetch failed", { description: data.error || "Unknown error" });
      }
    } catch (err) {
      toast.error("Fetch failed", { description: "Network error" });
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [catRes, xRes, mappingsRes] = await Promise.all([
          fetch("/api/bookmark-categories"),
          fetch("/api/x-folders"),
          fetch("/api/x-folder-mappings")
        ]);
        const catData = await catRes.json();
        const xData = await xRes.json();
        const mappingsData = await mappingsRes.json();
        
        setCategories(Array.isArray(catData) ? catData : []);
        setXFolders(Array.isArray(xData) ? xData : []);
        
        // Build map of folder -> project for quick lookup
        const mappingsMap = new Map<string, string>();
        if (Array.isArray(mappingsData)) {
          mappingsData.forEach((m: FolderMapping) => {
            if (m.description) {
              mappingsMap.set(m.x_folder, m.description);
            }
          });
        }
        setFolderMappings(mappingsMap);
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleXFolderClick = (folder: string) => {
    if (onSelectXFolder) {
      onSelectXFolder(folder);
    }
  };

  const handleCategoryClick = (slug: string) => {
    onSelectCategory(slug);
    if (onSelectXFolder) {
      onSelectXFolder(""); // Clear X folder selection
    }
  };

  const handleAllClick = () => {
    onSelectCategory("");
    if (onSelectXFolder) {
      onSelectXFolder("");
    }
  };

  const renderCategory = (category: Category, level = 0) => {
    return (
      <div key={category.id} style={{ marginLeft: `${level * 16}px` }}>
        <Button
          variant="ghost"
          size="sm"
          className={`w-full justify-start h-8 ${selectedCategory === category.slug ? "bg-accent" : ""}`}
          onClick={() => handleCategoryClick(category.slug)}
        >
          <span className="mr-2 text-sm">{category.emoji || "📁"}</span>
          <span className="flex-1 text-left text-sm truncate">{category.name}</span>
          <span className="text-xs text-muted-foreground ml-1">{category.total_count}</span>
        </Button>
        {category.children.length > 0 && (
          <div className="mt-0.5">
            {category.children.map((child) => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="h-full overflow-y-auto p-3">
      {/* All Bookmarks */}
      <Button
        variant="ghost"
        size="sm"
        className={`w-full justify-start h-8 mb-2 ${!selectedCategory && !selectedXFolder ? "bg-accent" : ""}`}
        onClick={handleAllClick}
      >
        <FolderOpen className="mr-2 h-4 w-4" />
        <span className="flex-1 text-left">All Bookmarks</span>
      </Button>

      {/* X Folders Section */}
      {xFolders.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between py-1">
            <button 
              className="flex items-center text-left text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setXFoldersExpanded(!xFoldersExpanded)}
            >
              {xFoldersExpanded ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
              <Twitter className="h-4 w-4 mr-2" />
              X Folders ({xFolders.length})
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" disabled={fetching}>
                  <RefreshCw className={`h-3 w-3 ${fetching ? 'animate-spin' : ''}`} />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Fetch X Bookmarks?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will fetch new bookmarks from X/Twitter. It may take a moment and uses API credits.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleFetchBookmarks}>Fetch</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          {xFoldersExpanded && (
            <div className="mt-1 space-y-0.5">
              {xFolders.map((folder) => {
                const mappedProject = folderMappings.get(folder.x_folder);
                return (
                  <Button
                    key={folder.x_folder}
                    variant="ghost"
                    size="sm"
                    className={`w-full justify-start h-7 pl-6 ${selectedXFolder === folder.x_folder ? "bg-accent" : ""}`}
                    onClick={() => handleXFolderClick(folder.x_folder)}
                    title={mappedProject ? `Mapped to: ${mappedProject}` : undefined}
                  >
                    {mappedProject && (
                      <span className="w-2 h-2 rounded-full bg-green-500 mr-2 flex-shrink-0" />
                    )}
                    <span className="flex-1 text-left text-sm truncate">{folder.x_folder}</span>
                    <span className="text-xs text-muted-foreground ml-1">{folder.bookmark_count}</span>
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Categories Section */}
      {categories.length > 0 && (
        <div>
          <button 
            className="flex items-center w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground py-1"
            onClick={() => setCategoriesExpanded(!categoriesExpanded)}
          >
            {categoriesExpanded ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
            Categories ({categories.length})
          </button>
          {categoriesExpanded && (
            <div className="mt-1 space-y-0.5">
              {categories.map((category) => renderCategory(category))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
