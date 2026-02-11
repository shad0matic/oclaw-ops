# Kanban API

This document outlines the API endpoints for the Kanban board feature in the oclaw-ops dashboard.

## Backlog

### `GET /api/kanban/backlog`

Retrieves a sorted list of all feature requests from the `planning/feature-requests/*.md` files.

-   **Method:** `GET`
-   **Authentication:** Required
-   **Response:**
    -   `200 OK`: An array of feature request objects.
    -   `500 Internal Server Error`: If there's an error reading the files.

#### Sorting Logic
The backlog is sorted first by project priority, then by individual item priority.

-   **Project Priority (ascending):** `oclaw-ops` (1), `taskbee` (2), `openpeople` (3), `teen-founder` (4), `boris-extensions` (5).
-   **Item Priority (ascending):** `high` (1), `medium` (2), `low` (3).

#### Example `curl`
```bash
curl -X GET http://localhost:3000/api/kanban/backlog
```

### `PATCH /api/kanban/backlog/:id`

Updates the YAML frontmatter of a specific feature request markdown file. This is used when a task is moved from the backlog to the "Planned" column.

-   **Method:** `PATCH`
-   **Authentication:** Required
-   **URL Parameters:**
    -   `id`: The filename of the feature request (without the `.md` extension).
-   **Request Body:** A JSON object with the fields to update.
    -   `status` (string)
    -   `assigned` (string)
    -   `priority` (string: "high", "medium", "low")
    -   `tags` (array of strings)
-   **Response:**
    -   `200 OK`: A confirmation object.
    -   `404 Not Found`: If the feature request file doesn't exist.
    -   `500 Internal Server Error`: If there's an error updating the file.

#### Example `curl`
```bash
curl -X PATCH http://localhost:3000/api/kanban/backlog/kanban-task-board \
  -H "Content-Type: application/json" \
  -d '{"status": "planned", "assigned": "bob"}'
```

## Tasks (from `ops.runs`)

### `GET /api/kanban/tasks`

Retrieves all relevant tasks from the `ops.runs` table and groups them into Kanban columns.

-   **Method:** `GET`
-   **Authentication:** Required
-   **Response:**
    -   `200 OK`: A JSON object where keys are column names (`planned`, `running`, `review`, `human_todo`, `done`) and values are arrays of task objects.
    -   `500 Internal Server Error`: If there's a database error.

#### Columns
-   `planned`: `status = 'pending'`
-   `running`: `status = 'in_progress' or 'running'`
-   `review`: `status = 'review'`
-   `human_todo`: `status = 'human_review'`
-   `done`: `status = 'completed'` (within the last 7 days)

#### Example `curl`
```bash
curl -X GET http://localhost:3000/api/kanban/tasks
```

### `POST /api/kanban/tasks`

Creates a new task in the `ops.runs` table, typically from a feature request in the backlog.

-   **Method:** `POST`
-   **Authentication:** Required
-   **Request Body:**
    -   `title` (string, required): The name of the task/workflow.
    -   `description` (string, optional): A longer description of the task.
    -   `agent_id` (string, optional): The agent assigned to the task.
    -   `source_feature_request` (string, optional): The filename of the source feature request.
-   **Response:**
    -   `201 Created`: The newly created task object.
    -   `400 Bad Request`: If the `title` is missing.
    -   `500 Internal Server Error`: If there's a database error.

#### Example `curl`
```bash
curl -X POST http://localhost:3000/api/kanban/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Implement Frontend for Kanban Board", "agent_id": "bob", "source_feature_request": "kanban-task-board.md"}'
```

### `PATCH /api/kanban/tasks/:id`

Updates an existing task in the `ops.runs` table. Used for moving tasks between columns, reassigning agents, and adding review feedback.

-   **Method:** `PATCH`
-   **Authentication:** Required
-   **URL Parameters:**
    -   `id`: The ID of the task (`run_id`).
-   **Request Body:** A JSON object with the fields to update.
    -   `status` (string)
    -   `agent_id` (string)
    -   `review_iteration` (number)
    -   `review_feedback` (string)
-   **Response:**
    -   `200 OK`: The updated task object.
    -   `404 Not Found`: If the task doesn't exist.
    -   `400 Bad Request`: If an invalid `status` is provided.
    -   `500 Internal Server Error`: If there's a database error.

#### Example `curl`
```bash
curl -X PATCH http://localhost:3000/api/kanban/tasks/123 \
  -H "Content-Type: application/json" \
  -d '{"status": "review", "review_feedback": "Looks good, just need to add tests."}'
```
