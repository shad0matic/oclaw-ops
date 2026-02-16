import { useState, useEffect } from "react";
import { Button } from "../ui/button";

interface Category {
  id: number;
  name: string;
  slug: string;
  emoji?: string;
  total_count: number;
  children: Category[];
}

interface CategorySidebarProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategorySidebar({ selectedCategory, onSelectCategory }: CategorySidebarProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);
        const res = await fetch("/api/bookmark-categories");
        const data = await res.json();
        setCategories(data);
      } catch (error) {
        console.error("Failed to fetch categories", error);
      } finally {
        setLoading(false);
      }
    }
    fetchCategories();
  }, []);

  const renderCategory = (category: Category, level = 0) => {
    return (
      <div key={category.id} className="ml-[${level * 16}px]" style={{ marginLeft: `${level * 16}px` }}>
        <Button
          variant="ghost"
          className={`w-full justify-start ${selectedCategory === category.slug ? "bg-accent" : ""}`}
          onClick={() => onSelectCategory(category.slug)}
        >
          <span className="mr-2">{category.emoji || "📁"}</span>
          <span className="flex-1 text-left">{category.name}</span>
          <span className="text-xs text-muted-foreground">{category.total_count}</span>
        </Button>
        {category.children.length > 0 && (
          <div className="mt-1">
            {category.children.map((child) => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="p-4">Loading categories...</div>;
  }

  return (
    <div className="h-full overflow-y-auto p-4 border-r border-border">
      <h3 className="text-lg font-medium mb-4">Categories</h3>
      <div className="space-y-2">
        {categories.map((category) => renderCategory(category))}
      </div>
    </div>
  );
}
