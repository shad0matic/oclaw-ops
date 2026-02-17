# Smaug: X Bookmarks → KB Pipeline - Full Spec

**Author:** Nefario (Gemini)
**Date:** 17/02/2026
**Status:** Draft

---

## 1. Problem Statement

Valuable insights and links are frequently bookmarked on X (formerly Twitter) but are rarely revisited or integrated into our central knowledge base. The process is manual and time-consuming, leading to a loss of collective knowledge. We need an automated pipeline to archive, analyze, and transform these bookmarks into a structured, searchable knowledge base.

This project, codenamed "Smaug," will create an automated pipeline for this purpose.

---

## 2. Core Features

- **Automated Archiving:** A service that automatically ingests new X bookmarks.
- **Folder Organization:** A system to categorize bookmarks into specific folders or topics.
- **AI-Powered Analysis:** Per-folder analysis to summarize content, identify key themes, and extract actionable insights.
- **Knowledge Base Integration:** A mechanism to store the extracted knowledge in a structured format.
- **Weekly Digest:** An automated report summarizing the week's new knowledge.

---

## 3. DB Schema

This project will require several new tables to manage bookmarks, folders, and the knowledge extracted from them.

```sql
-- Table to store raw X bookmarks
CREATE TABLE IF NOT EXISTS kb.x_bookmarks (
    id BIGSERIAL PRIMARY KEY,
    tweet_id VARCHAR(255) NOT NULL UNIQUE,
    author_id VARCHAR(255),
    author_name VARCHAR(255),
    tweet_text TEXT,
    full_json JSONB, -- The original tweet object
    url VARCHAR(1024),
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for organizing bookmarks into folders
CREATE TABLE IF NOT EXISTS kb.bookmark_folders (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Junction table to link bookmarks to folders (many-to-many)
CREATE TABLE IF NOT EXISTS kb.bookmark_folder_items (
    bookmark_id BIGINT REFERENCES kb.x_bookmarks(id) ON DELETE CASCADE,
    folder_id BIGINT REFERENCES kb.bookmark_folders(id) ON DELETE CASCADE,
    PRIMARY KEY (bookmark_id, folder_id)
);

-- Table to store the output of AI analysis
CREATE TABLE IF NOT EXISTS kb.knowledge_entries (
    id BIGSERIAL PRIMARY KEY,
    source_type VARCHAR(50) NOT NULL, -- 'x_bookmark_folder', 'manual_entry', etc.
    source_folder_id BIGINT REFERENCES kb.bookmark_folders(id),
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    key_points JSONB, -- e.g., ["Point 1", "Point 2"]
    tags VARCHAR(255)[],
    related_tweet_ids VARCHAR(255)[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_knowledge_entries_tags ON kb.knowledge_entries USING GIN(tags);

```

---

## 4. System Architecture & API Endpoints

This is more of a pipeline project than a UI-heavy one. The "API" will consist of services and cron jobs.

### 4.1. Ingestion Service (`smaug-ingest`)
- A standalone script/service that runs periodically (e.g., every 15 minutes).
- Uses the X API to fetch the latest bookmarks.
- Inserts new bookmarks into the `kb.x_bookmarks` table, avoiding duplicates based on `tweet_id`.

### 4.2. Organization Service (`smaug-organize`)
- This could be a manual UI or an automated, keyword-based service.
- **API (for a future UI):**
    - `GET /api/kb/folders`: List all folders.
    - `POST /api/kb/folders`: Create a new folder.
    - `GET /api/kb/bookmarks/unclassified`: Get bookmarks not yet in any folder.
    - `POST /api/kb/folders/:folderId/add`: Add a bookmark to a folder.
- **Automated Approach:** A script that uses keywords or AI to automatically assign bookmarks to folders.

### 4.3. Analysis Service (`smaug-analyze`)
- A cron job that runs periodically (e.g., nightly).
- It scans folders for new bookmarks since the last analysis.
- For each folder with new content, it gathers the text from all new tweets.
- It sends the compiled text to a powerful AI model (e.g., Claude 3.5 Sonnet) with a prompt to generate:
    - A concise summary of the new information.
    - A list of key points or insights.
    - Relevant tags.
- The output is then used to create or update an entry in `kb.knowledge_entries`.

### 4.4. Digest Service (`smaug-digest`)
- A cron job that runs weekly (e.g., every Friday).
- It queries `kb.knowledge_entries` for all entries created in the past week.
- It formats this content into a clean markdown or HTML digest.
- It sends the digest to a specified destination (e.g., a Telegram channel, email).

### 4.5. Knowledge Base API
- `GET /api/kb/search?q=<query>`: A search endpoint to find knowledge entries by keyword, title, or tag.
- `GET /api/kb/entries/:id`: Retrieve a specific knowledge entry.

---

## 5. UI Components

While mostly a backend project, some UI will be necessary for management.

### Knowledge Base Home Page (`/kb`)
- A search bar as the primary element.
- A list of recent knowledge entries.
- A way to browse by folder or tag.

### Folder View (`/kb/folders/:id`)
- Displays the AI-generated summary for the folder.
- Lists the individual bookmarks contained within that folder.

### Management UI (`/kb/manage`)
- A simple interface to create/rename/delete folders.
- A view to see unclassified bookmarks and assign them to folders.

---

## 6. Implementation Plan

### Phase 1: Ingestion & Storage
- **Task:** Create the `kb` schema and the `x_bookmarks`, `bookmark_folders`, and `bookmark_folder_items` tables.
- **Task:** Develop the `smaug-ingest` script to fetch and store X bookmarks. Set it up as a cron job.
- **Task:** Create a basic UI for creating folders and manually assigning bookmarks to them. This is crucial for providing the raw material for analysis.

### Phase 2: AI Analysis
- **Task:** Create the `knowledge_entries` table.
- **Task:** Develop the `smaug-analyze` script. This will involve:
    - Logic to identify "new" bookmarks in a folder.
    - Crafting an effective prompt for the AI model.
    - Code to insert the AI's output into `kb.knowledge_entries`.
- **Task:** Set up `smaug-analyze` as a nightly cron job.

### Phase 3: Digest & Search
- **Task:** Develop the `smaug-digest` script to generate and send the weekly summary.
- **Task:** Build the search API endpoint (`GET /api/kb/search`).
- **Task:** Create the frontend UI for searching and displaying knowledge entries.

### Phase 4: Polish & Automation
- **Task:** (Optional) Explore AI-based auto-classification of bookmarks into folders to reduce manual effort.
- **Task:** Improve the knowledge base UI with features like related entries, better filtering, etc.

---

## 7. Open Questions

1. **API Keys & Rate Limits:** Accessing the X API requires credentials and is subject to rate limits. How will we manage this?
2. **Data Privacy:** Are there any privacy concerns with storing and analyzing bookmarked tweets? (Assumption: Since bookmarks are a user action on public data, this is acceptable for internal use).
3. **Prompt Engineering:** The success of the analysis phase depends heavily on the quality of the prompt sent to the AI. This will require iteration and refinement.
4. **Handling Multimedia:** How should the pipeline handle bookmarks that are primarily images or videos? (Suggestion: For Phase 1, focus only on text. Later phases could incorporate vision models).
