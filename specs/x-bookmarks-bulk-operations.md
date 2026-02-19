# X Bookmarks: Bulk Operations

**Status:** Draft  
**Author:** Kevin 🍌  
**Date:** 2026-02-19  
**Task:** #93  
**Parent Epic:** #48 Smaug KB Pipeline  
**Depends On:** M3 (Manual Categorization)

---

## Overview

Add multi-select and bulk operations to the X Bookmarks page for efficient bookmark management.

---

## Features

### 1. Multi-Select Mode

**Activation:**
- Click checkbox on bookmark card (enters selection mode)
- Or Cmd/Ctrl+Click to toggle selection
- "Select All" / "Deselect All" in toolbar

**Visual:**
- Checkbox appears on hover (always visible in selection mode)
- Selected bookmarks have highlighted border
- Floating action bar appears when selection > 0

### 2. Bulk Actions Toolbar

**Appears when:** 1+ bookmarks selected

**Actions:**
| Action | Icon | Description |
|--------|------|-------------|
| Move to... | 📁 | Move all selected to category |
| Delete | 🗑️ | Delete all selected (with confirmation) |
| Mark processed | ✓ | Set processed=true on all |
| Clear selection | ✕ | Deselect all |

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ ☑ 12 selected    [Move to...] [Delete] [Clear ✕]   │
└─────────────────────────────────────────────────────┘
```

---

## API

### Bulk Move
```
PATCH /api/x-bookmarks/bulk
Body: { 
  ids: string[], 
  action: "move", 
  category_id: number 
}
```

### Bulk Delete
```
DELETE /api/x-bookmarks/bulk
Body: { ids: string[] }
```

### Bulk Update
```
PATCH /api/x-bookmarks/bulk
Body: { 
  ids: string[], 
  action: "update",
  fields: { processed?: boolean, ... }
}
```

---

## State Management

```tsx
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [selectionMode, setSelectionMode] = useState(false);

// Enter selection mode on first selection
const toggleSelect = (id: string) => {
  setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    if (next.size === 0) setSelectionMode(false);
    else setSelectionMode(true);
    return next;
  });
};
```

---

## Acceptance Criteria

- [ ] Can select multiple bookmarks via checkbox or Cmd+Click
- [ ] Selection count shown in toolbar
- [ ] Can bulk move selected bookmarks to a category
- [ ] Can bulk delete with confirmation modal
- [ ] Can clear selection
- [ ] "Select All" selects all visible (filtered) bookmarks
- [ ] Selection persists across pagination/scroll

---

## UX Notes

- Confirmation required for bulk delete (shows count)
- Bulk move shows category picker dropdown
- Toast notification after bulk action completes
- Optimistic updates for snappy UX
