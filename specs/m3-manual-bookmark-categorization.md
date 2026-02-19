# M3: Manual Bookmark Categorization UI

**Status:** Draft  
**Author:** Kevin 🍌  
**Date:** 2026-02-19  
**Parent Epic:** #48 Smaug KB Pipeline  
**Depends On:** M1 (KB Bookmarks UI), M2 (Extraction Pipeline)

---

## Overview

Add manual categorization capabilities to the X Bookmarks UI. Users can move bookmarks between categories and manage categories (create/edit/delete).

---

## Features

### 1. Move Bookmark to Category

**UI Location:** Bookmark card context menu / drag-and-drop

**Interaction:**
- Right-click bookmark → "Move to..." → Category picker
- Or drag bookmark to category in sidebar
- Single bookmark move (bulk in M3b)

**API:**
```
PATCH /api/x-bookmarks/:id
Body: { category_id: number | null }
```

### 2. Category Management Modal

**Trigger:** "Manage Categories" button in sidebar or settings

**Features:**
- List all categories with bookmark counts
- Add new category (name, icon/emoji, color)
- Edit existing category
- Delete category (with confirmation, moves bookmarks to "Uncategorized")
- Reorder categories (drag-and-drop)

**API:**
```
GET    /api/bookmark-categories
POST   /api/bookmark-categories         { name, icon, color }
PATCH  /api/bookmark-categories/:id     { name?, icon?, color?, order? }
DELETE /api/bookmark-categories/:id
```

---

## Database

Uses existing `ops.bookmark_folders` table:
- `id`, `name`, `icon`, `color`, `parent_id`, `order`, `created_at`

---

## UI Components

### CategoryPicker (dropdown/popover)
```tsx
<CategoryPicker 
  bookmarkId={id}
  currentCategory={category}
  onMove={(categoryId) => moveMutation.mutate({ id, categoryId })}
/>
```

### CategoryManagerModal
```tsx
<CategoryManagerModal
  open={open}
  onOpenChange={setOpen}
  categories={categories}
  onAdd={...}
  onEdit={...}
  onDelete={...}
  onReorder={...}
/>
```

---

## Acceptance Criteria

- [ ] Can move a bookmark to any category via context menu
- [ ] Can create new category with name/icon
- [ ] Can edit existing category name/icon
- [ ] Can delete category (bookmarks move to uncategorized)
- [ ] Can reorder categories
- [ ] Changes persist and reflect immediately in UI

---

## Notes

- Keep it simple — no nested categories in M3 (flat structure)
- Bulk operations in separate task (#93)
