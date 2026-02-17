# Command Palette (Cmd+K) - Spec

**Author:** Kevin 🍌
**Date:** 17/02/2026
**Status:** Queued
**Task:** #104
**Effort:** ~2-3h

---

## 1. Problem

Finding tasks, specs, and research in MC requires manual navigation or remembering task IDs. Boss needs a fast way to search across all project artifacts.

---

## 2. Solution

A global **Command Palette** (Cmd+K / Ctrl+K) that searches across:
- Tasks (`task_queue`)
- Specs (`docs/specs/*.md`)
- Research (`docs/research/*.md`)
- Agent activity (`agent_events`)

---

## 3. UI Design

### Trigger
- **Keyboard:** `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux)
- **Click:** Search icon in header (optional)

### Dialog
```
┌─────────────────────────────────────────────────────────┐
│ 🔍 Search tasks, specs, research...                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Recent                                                  │
│ ├─ 📋 #89 Isometric minion office roadmap        done   │
│ └─ 📄 smaug-kb-pipeline-spec.md                         │
│                                                         │
│ ─────────────────────────────────────────────────────── │
│                                                         │
│ Results for "isometric"                                 │
│ ├─ 📋 #89 Isometric minion office roadmap        done   │
│ ├─ 📋 #87 Lab isometric page - avatars           done   │
│ ├─ 📋 #12 Wire isometric office to real data     done   │
│ ├─ 📄 isometric-art-tools.md                            │
│ └─ 🔬 Nefario research (14/02)                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Result Types & Icons
| Type | Icon | Source |
|------|------|--------|
| Task | 📋 | `task_queue` |
| Spec | 📄 | `docs/specs/*.md` |
| Research | 📄 | `docs/research/*.md` |
| Agent Activity | 🔬 | `agent_events` |
| Epic | 🎯 | `task_queue` where title starts with "EPIC:" |

### Keyboard Navigation
- `↑` / `↓` — Navigate results
- `Enter` — Open selected item
- `Esc` — Close palette
- Type to search (debounced 150ms)

### Type Filters (optional prefix)
- `task:` — Only tasks
- `spec:` — Only specs
- `agent:bob` — Only Bob's items
- `status:running` — Only running tasks
- `epic:` — Only epics

---

## 4. API Endpoint

### `GET /api/search?q={query}&type={filter}`

**Request:**
```
GET /api/search?q=isometric&limit=10
```

**Response:**
```json
{
  "results": [
    {
      "type": "task",
      "id": 89,
      "title": "Research: Isometric minion office roadmap",
      "status": "done",
      "agent": "nefario",
      "url": "/tasks/89"
    },
    {
      "type": "spec",
      "path": "docs/specs/isometric-art-tools.md",
      "title": "Isometric Art Generation Tools",
      "url": "/specs/isometric-art-tools"
    },
    {
      "type": "event",
      "id": 1234,
      "agent": "nefario",
      "task": "Isometric research",
      "date": "2026-02-14",
      "url": "/agents/nefario?event=1234"
    }
  ],
  "query": "isometric",
  "total": 3
}
```

### Search Logic
```typescript
// Fuzzy search with scoring
const searchTasks = async (q: string) => {
  return db.query(`
    SELECT id, title, status, agent_id, epic,
           ts_rank(to_tsvector('english', title || ' ' || COALESCE(notes, '')), 
                   plainto_tsquery('english', $1)) as rank
    FROM ops.task_queue
    WHERE to_tsvector('english', title || ' ' || COALESCE(notes, '')) 
          @@ plainto_tsquery('english', $1)
    ORDER BY rank DESC
    LIMIT 10
  `, [q]);
};

// File search (specs + research)
const searchFiles = async (q: string) => {
  const files = await glob('docs/{specs,research}/*.md');
  return files
    .filter(f => {
      const content = fs.readFileSync(f, 'utf-8');
      return content.toLowerCase().includes(q.toLowerCase());
    })
    .map(f => ({
      type: 'spec',
      path: f,
      title: extractTitle(f), // First # heading
    }));
};
```

---

## 5. Component Implementation

### Using shadcn/ui CommandDialog

```tsx
// components/command-palette.tsx
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
import { FileText, ListTodo, FlaskConical, Target } from 'lucide-react';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const router = useRouter();

  // Cmd+K listener
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

  // Debounced search
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results);
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'task': return <ListTodo className="mr-2 h-4 w-4" />;
      case 'epic': return <Target className="mr-2 h-4 w-4" />;
      case 'spec': return <FileText className="mr-2 h-4 w-4" />;
      case 'event': return <FlaskConical className="mr-2 h-4 w-4" />;
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
                onSelect={() => {
                  router.push(item.url);
                  setOpen(false);
                }}
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
```

### Add to Layout

```tsx
// app/(dashboard)/layout.tsx
import { CommandPalette } from '@/components/command-palette';

export default function DashboardLayout({ children }) {
  return (
    <>
      <CommandPalette />
      {/* ... rest of layout */}
    </>
  );
}
```

---

## 6. Database Optimization (Optional)

For faster full-text search, add a GIN index:

```sql
-- Add full-text search index on task_queue
CREATE INDEX IF NOT EXISTS idx_task_queue_fts 
ON ops.task_queue 
USING GIN (to_tsvector('english', title || ' ' || COALESCE(notes, '') || ' ' || COALESCE(epic, '')));
```

---

## 7. Recent Searches (Nice-to-have)

Store in localStorage:
```typescript
const RECENT_KEY = 'mc-recent-searches';
const MAX_RECENT = 5;

const addRecent = (item: SearchResult) => {
  const recent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  const updated = [item, ...recent.filter(r => r.url !== item.url)].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
};
```

---

## 8. Implementation Checklist

### Bob (UI)
- [ ] Install shadcn command component: `pnpm dlx shadcn@latest add command`
- [ ] Create `components/command-palette.tsx`
- [ ] Add to dashboard layout
- [ ] Style result items with icons + status badges
- [ ] Add keyboard hint in header ("⌘K")

### Stuart (DB)
- [ ] Add FTS index on `task_queue` (optional, for performance)

### Kevin (API)
- [ ] Create `/api/search` endpoint
- [ ] Implement task search with `ts_rank`
- [ ] Implement file search for specs/research
- [ ] Add agent_events search

---

## 9. Future Enhancements

- **Actions:** Not just navigation — "Create task", "Spawn agent", "Rebuild dashboard"
- **Slash commands:** `/task new`, `/agent bob`, `/deploy`
- **AI search:** Natural language queries ("what did Nefario research last week?")

---

**Estimated time:** 2-3h total
- API: 30min
- UI: 1.5h
- Testing: 30min
