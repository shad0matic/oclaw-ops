'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { FileText, ListTodo, Target } from 'lucide-react';

interface SearchResult {
  type: string;
  id?: number;
  path?: string;
  title: string;
  status?: string;
  url: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (url: string) => {
    router.push(url);
    setOpen(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'task': return <ListTodo className="mr-2 h-4 w-4" />;
      case 'epic': return <Target className="mr-2 h-4 w-4" />;
      case 'spec':
      case 'research':
        return <FileText className="mr-2 h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Search tasks, specs, research..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {results.length > 0 && (
          <CommandGroup heading="Results">
            {results.map((item) => (
              <CommandItem
                key={`${item.type}-${item.id || item.path}`}
                onSelect={() => handleSelect(item.url)}
              >
                {getIcon(item.type)}
                <span>{item.title}</span>
                {item.status && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {item.status}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
