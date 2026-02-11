# SPEC: Settings Page for Minions Control

## Overview
This spec defines a new 'Settings' page in the Mission Control Dashboard (`oclaw-ops/dashboard/`) to manage agent avatars. The page will allow the user to assign images to agents from an existing library or upload new images.

## Page Location
- **URL:** `/settings`
- **Navigation:** Add to sidebar or top menu as 'Settings' with a gear icon (or similar).
- **Access:** Available to all authenticated users (same as other dashboard pages).

## Features

### 1. Agent Avatar Management
- **List of Agents:** Display all agents from the configuration (`agents.list` in `openclaw.json` or database if dynamic).
  - Show: Agent name, current avatar (image/emoji/initial), ID.
  - Sort: Alphabetical by name.
- **Avatar Selection:** For each agent, provide a dropdown or grid of available images to choose from.
  - Source: Images in `public/assets/minion-avatars/` (e.g., `kevin.webp`, `bob.webp`).
  - Preview: Show thumbnail of selected image next to agent name.
  - Save: Button or auto-save on selection change, updates avatar path in agent config or database.
- **Fallback Handling:** If no image is assigned, use the configured default image (see below), falling back to emoji → initial if no default is set.

### 2. Default Avatar Configuration
- **Default Image Setting:** Allow selection of a generic image to be used for agents without a custom avatar.
  - Label: "Default Avatar for Unassigned Agents"
  - Selection: Choose from existing images in `public/assets/minion-avatars/` via dropdown or grid.
  - Preview: Show thumbnail of selected default image.
  - Upload Option: Include a direct upload button here for a new default image (follows same upload/cropping rules as below).
  - Save: Button or auto-save on selection, stores path (e.g., `default.webp`) in config or database.
- **Usage:** Applies to new agents, unnamed agents, or any without a specific image assignment.
- **Fallback:** If no default image is set, use current logic (emoji → initial).

### 3. Available Images Library
- **Grid View:** Display all images currently in `public/assets/minion-avatars/`.
  - Show: Thumbnail (100x100px or similar), filename (e.g., `kevin.webp`), size (KB).
  - Sort: Alphabetical by filename or date added.
  - Pagination: If >50 images, paginate or lazy-load.
- **Usage Indicator:** Highlight if an image is currently assigned to an agent (e.g., label with agent name) or set as default (label "Default Avatar").
- **Delete Option:** Allow deletion of unused images (confirm dialog to prevent accidents).
  - Constraint: Prevent deletion if image is assigned to an agent or set as default.

### 4. Image Upload
- **Upload Form:** Simple file input for new avatar images.
  - Accepted Formats: `.jpg`, `.jpeg`, `.png`, `.webp` (convert non-webp to webp internally if possible).
  - Size Limit: 500KB per image (warn and reject if larger).
  - Naming: Auto-rename to lowercase agent ID if matches an agent (e.g., `bob.webp`); otherwise use sanitized filename.
- **Visual Cropping Step:** After selecting a file, display a preview with an interactive cropping interface.
  - Library: Use `react-easy-crop` or `cropperjs` for client-side cropping.
  - Crop Area: Enforce a square aspect ratio (1:1) for avatars, default to center of image.
  - Controls: Allow drag/resize of crop box to focus on face or desired area, optional zoom for precision.
  - Preview: Show real-time preview of cropped result (target 300x300px or similar).
  - Confirmation: Button to finalize crop ("Confirm Crop & Upload").
- **Processing:** After cropping, resize final output to max 300x300px, save to `public/assets/minion-avatars/`.
- **Feedback:** Show success/error message post-upload (e.g., "Uploaded bob.webp successfully").
- **Refresh:** Auto-refresh library grid after upload.

## UI Design
- **Layout:** Standard dashboard card-based design (match existing pages like `/agents`).
  - Top Section: Agent list with avatar selection dropdowns.
  - Middle Section: Available images grid.
  - Bottom Section: Upload form with brief instructions.
- **Styling:** Use Tailwind + shadcn/ui components (dark mode default).
  - Cards for each section, responsive grid for images (1-col mobile, 3+ desktop).
  - Button for save (if not auto-save), upload button with file picker.
- **Accessibility:** ARIA labels for image selection, keyboard nav for dropdowns/grid.

## Data Handling
- **Backend:**
  - **GET /api/agents/avatars:** Fetch current avatar assignments (or read from config).
  - **POST /api/agents/avatars:** Update avatar path for an agent (e.g., `{agentId: 'bob', avatar: 'bob.webp'}`).
  - **GET /api/avatars/library:** List files in `public/assets/minion-avatars/` with metadata (size, date).
  - **POST /api/avatars/upload:** Handle file upload, resize, save.
  - **DELETE /api/avatars/[filename]:** Remove unused image file.
- **Storage:**
  - Avatars stay in `public/assets/minion-avatars/` for static serving.
  - Track assignments in a small JSON file or Postgres table (`ops.agent_avatars` if dynamic).
- **Validation:**
  - Ensure uploaded files are valid images (check MIME type).
  - Prevent overwriting existing files unless confirmed.

## Edge Cases
- **No Images:** Show placeholder text in library ("No images uploaded yet") and disable selection dropdowns.
- **Upload Fails:** Display error (e.g., "File too large, max 500KB").
- **Agent Without ID Match:** For uploaded images not matching an agent ID, allow manual assignment via dropdown.
- **Mobile View:** Stack sections vertically, shrink thumbnails to fit screen.

## Dependencies
- **Image Processing:** Use `sharp` (npm package) for resize/convert if not already in project; otherwise, use existing tools.
- **File Upload:** Leverage Next.js API routes with `formidable` or similar for multipart handling.

## Priority
Medium — Enhances personalization and control over agent identity, builds on existing avatar work.

## Next Steps
- Assign Bob 🎨 to implement UI and API routes once spec is approved.
- Ensure uploaded images sync to `~/.openclaw/workspace/assets/minion-avatars/` for backup or cross-agent use.
- Review with Boss for any additional settings (beyond avatars) to include on this page.
