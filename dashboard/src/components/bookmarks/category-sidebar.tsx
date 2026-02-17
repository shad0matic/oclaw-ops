import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { ChevronDown, ChevronRight, FolderOpen, Twitter } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [xFoldersExpanded, setXFoldersExpanded] = useState(true);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [catRes, xRes] = await Promise.all([
          fetch("/api/bookmark-categories"),
          fetch("/api/x-folders")
        ]);
        const catData = await catRes.json();
        const xData = await xRes.json();
        setCategories(Array.isArray(catData) ? catData : []);
        setXFolders(Array.isArray(xData) ? xData : []);
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
      onSelectCategory(""); // Clear category selection
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
          <button 
            className="flex items-center w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground py-1"
            onClick={() => setXFoldersExpanded(!xFoldersExpanded)}
          >
            {xFoldersExpanded ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
            <Twitter className="h-4 w-4 mr-2" />
            X Folders ({xFolders.length})
          </button>
          {xFoldersExpanded && (
            <div className="mt-1 space-y-0.5">
              {xFolders.map((folder) => (
                <Button
                  key={folder.x_folder}
                  variant="ghost"
                  size="sm"
                  className={`w-full justify-start h-7 pl-6 ${selectedXFolder === folder.x_folder ? "bg-accent" : ""}`}
                  onClick={() => handleXFolderClick(folder.x_folder)}
                >
                  <span className="flex-1 text-left text-sm truncate">{folder.x_folder}</span>
                  <span className="text-xs text-muted-foreground ml-1">{folder.bookmark_count}</span>
                </Button>
              ))}
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
