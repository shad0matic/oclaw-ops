# Cron Job Management UI - Full Spec

**Author:** Nefario (Gemini)
**Date:** 17/02/2026
**Status:** Draft

---

## 1. Problem Statement

Cron jobs are currently managed directly on the server via command line, which is opaque and accessible only to developers with SSH access. There is no central place to view all scheduled tasks, check their run history, enable/disable them, or trigger them manually. This makes debugging failed jobs and managing scheduled tasks difficult and time-consuming.

This spec proposes a user-friendly web UI within the MC Dashboard to manage all system cron jobs.

---

## 2. Core Features

- **List & View:** Display all cron jobs in a clear, sortable table.
- **Enable/Disable:** Toggle jobs on or off without editing the crontab file.
- **Run History:** View a log of past runs for each job, including status (success/failure) and output.
- **Manual Trigger:** A "Run Now" button to execute a job on-demand.
- **Edit/Create (Future):** A form to edit existing jobs or create new ones.

---

## 3. DB Schema

We need tables to store information about the jobs, their status, and their execution history.

```sql
-- Table to define the cron jobs
CREATE TABLE IF NOT EXISTS ops.cron_jobs (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    schedule VARCHAR(100) NOT NULL, -- e.g., '0 5 * * *'
    command TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table to log the history of each cron job run
CREATE TABLE IF NOT EXISTS ops.cron_job_history (
    id BIGSERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL REFERENCES ops.cron_jobs(id) ON DELETE CASCADE,
    run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_ms INT,
    status VARCHAR(20) NOT NULL, -- 'success', 'failure', 'running'
    output TEXT, -- To store stdout/stderr
    CONSTRAINT fk_job_id FOREIGN KEY (job_id) REFERENCES ops.cron_jobs(id)
);
CREATE INDEX IF NOT EXISTS idx_cron_job_history_job_id ON ops.cron_job_history(job_id);
CREATE INDEX IF NOT EXISTS idx_cron_job_history_run_at ON ops.cron_job_history(run_at);
```

A cron runner script will be responsible for reading from `ops.cron_jobs` and executing the commands, logging the results to `ops.cron_job_history`.

---

## 4. API Endpoints

- `GET /api/cron/jobs`: Retrieves a list of all defined cron jobs from the `cron_jobs` table.
- `GET /api/cron/jobs/:id`: Get details for a single cron job.
- `GET /api/cron/jobs/:id/history`: Retrieves the run history for a specific job, with pagination.
- `POST /api/cron/jobs/:id/toggle`: Enables or disables a job (updates the `is_enabled` flag).
- `POST /api/cron/jobs/:id/trigger`: Manually triggers a job to run immediately.
- `PUT /api/cron/jobs/:id`: (Phase 2) Updates the details of a cron job.
- `POST /api/cron/jobs`: (Phase 2) Creates a new cron job.

---

## 5. UI Components

### Main Cron Jobs Page (`/cron`)
- **Cron Jobs Table:** A table displaying all cron jobs with the following columns:
    - **Status:** A green/red indicator light showing if the job is enabled.
    - **Name:** The job's name.
    - **Schedule:** The cron schedule string.
    - **Last Run:** Timestamp of the last execution.
    - **Last Status:** Success/Failure indicator for the last run.
    - **Actions:** A button group with "History", "Run Now", and a toggle switch for enable/disable.
- **Search/Filter Bar:** To quickly find jobs by name.

### Job Detail/History Side Sheet
- Triggered by clicking the "History" button for a job.
- **Header:** Shows the job's name, description, schedule, and command.
- **History Table:** A paginated list of all past runs for this job, showing:
    - **Run At:** Timestamp of the run.
    - **Duration:** How long the job took to complete.
    - **Status:** Success/Failure badge.
    - **Output:** A button or link to view the full log output in a modal or separate view.

### Log Output Modal
- A simple modal that displays the raw text output (`stdout`/`stderr`) of a selected job run.

---

## 6. Implementation Plan

### Phase 1: Core Backend & UI
- **Task:** Create the `cron_jobs` and `cron_job_history` tables in the database.
- **Task:** Manually populate the `cron_jobs` table with our existing system cron jobs.
- **Task:** Develop a master cron runner script (`scripts/master-cron-runner.mjs`). This script will be the *only* entry in the system's actual crontab, running every minute.
    - Its job is to:
        1. Query the `ops.cron_jobs` table for all `is_enabled=true` jobs.
        2. Determine which ones are due to run *now*.
        3. Execute them, capture the output, and log the results to `ops.cron_job_history`.
- **Task:** Build the API endpoints: `GET /api/cron/jobs` and `GET /api/cron/jobs/:id/history`.
- **Task:** Create the main Cron Jobs page UI to list the jobs and display their history.

### Phase 2: Interactivity
- **Task:** Implement the `POST /api/cron/jobs/:id/toggle` endpoint.
- **Task:** Add the enable/disable toggle switch to the UI and connect it to the API.
- **Task:** Implement the `POST /api/cron/jobs/:id/trigger` endpoint, which will instruct the master runner to execute a job immediately.
- **Task:** Add the "Run Now" button to the UI.

### Phase 3: Editing and Creation (Future Scope)
- **Task:** Build the API endpoints for creating (`POST`) and updating (`PUT`) jobs.
- **Task:** Create a form in the UI for adding and editing cron job details.
- **Task:** Add robust validation for cron schedule syntax.

---

## 7. Open Questions

1. **Security:** Executing arbitrary commands from a database is risky. How do we secure the `command` field? (Suggestion: Initially, make the command field read-only in the UI. All new jobs must be added via code review and migration. The UI can only manage schedule, status, etc.)
2. **Concurrency:** What happens if a job takes longer to run than its schedule interval? (Suggestion: The master runner should implement a locking mechanism, e.g., by setting a 'running' status in the history table, to prevent a job from starting if its previous instance is still running).
3. **Permissions:** Who can view, trigger, and edit cron jobs? (Suggestion: For now, all dashboard users. We can add role-based access control later).
