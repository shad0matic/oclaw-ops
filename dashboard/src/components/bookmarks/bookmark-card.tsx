import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface Bookmark {
  id: string;
  author: string;
  text: string;
  created_at: string;
  category: string;
  url: string;
}

interface BookmarkCardProps {
  bookmark: Bookmark;
}

export function BookmarkCard({ bookmark }: BookmarkCardProps) {
  // Truncate text to a reasonable length
  const truncatedText = bookmark.text.length > 150 
    ? bookmark.text.substring(0, 150) + "..." 
    : bookmark.text;
  
  // Format date
  const date = new Date(bookmark.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  // Generate initials for avatar
  const initials = bookmark.author
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);

  const [categories, setCategories] = useState<any[]>([]);
  const [currentCategory, setCurrentCategory] = useState(bookmark.category);

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

  const handleCategoryChange = async (newCategory: string) => {
    try {
      const res = await fetch(`/api/bookmarks/update-category`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookmarkId: bookmark.id, category: newCategory }),
      });
      if (res.ok) {
        setCurrentCategory(newCategory);
      } else {
        console.error("Failed to update category");
      }
    } catch (error) {
      console.error("Error updating category", error);
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
    <div className="border rounded-lg p-4 hover:shadow-sm transition-shadow duration-200 flex flex-col gap-3 bg-card">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium text-foreground">@{bookmark.author}</div>
          <div className="text-sm text-muted-foreground">{date}</div>
        </div>
      </div>
      <div className="text-base text-foreground/90">{truncatedText}</div>
      <div className="flex justify-between items-center">
        <Select value={currentCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => renderCategoryOptions(cat))}
          </SelectContent>
        </Select>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.open(bookmark.url, "_blank")}
        >
          View
        </Button>
      </div>
    </div>
  );
}
