# Refactor Hardcoded Paths — Self-Locating Scripts

**Status:** Done  
**Author:** Kevin 🍌  
**Date:** 2026-02-19  
**Completed:** 2026-02-20 by Bob  

---

## Problem

Scripts throughout the workspace have hardcoded `/home/openclaw` paths, making them:
- Non-portable between users/machines
- Painful to migrate (as we just experienced with shad→openclaw)
- Error-prone when paths change

---

## Solution

Replace hardcoded paths with **self-locating scripts + `$HOME`**:
1. Scripts derive paths from their own location
2. Use `$HOME` for user-relative paths
3. No env vars to manage, no config files to maintain

---

## Patterns

### Bash scripts:
```bash
#!/bin/bash
# Self-locate — script knows where it lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(dirname "$SCRIPT_DIR")"
OPENCLAW_DIR="$HOME/.openclaw"

# Derived paths
BACKUP_DIR="$HOME/backups/openclaw"
PROJECTS_DIR="$HOME/projects"
```

### Node.js (ESM):
```javascript
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKSPACE_DIR = dirname(__dirname);
const OPENCLAW_DIR = join(homedir(), '.openclaw');
```

### Node.js (CommonJS):
```javascript
const { join } = require('path');
const { homedir } = require('os');

const WORKSPACE_DIR = join(__dirname, '..');
const OPENCLAW_DIR = join(homedir(), '.openclaw');
```

---

## Files to Update

### Workspace scripts (`~/.openclaw/workspace/scripts/`)
- [x] cost-estimator.mjs
- [x] spec-generator.mjs
- [x] task-ack-loop.sh
- [x] generate-db-schema.sh
- [x] memory-rotate.sh
- [x] generate-db-schema-html.sh
- [x] kanban-watcher.mjs
- [x] backup-openclaw.sh
- [x] smaug-watchdog.sh
- [x] smaug-fetch-bookmarks.mjs (additional)
- [x] task-ack-watcher.sh (additional)

### oclaw-ops tools (`~/projects/oclaw-ops/tools/`)
- [x] session-poller.mjs
- [x] spawn-wrapper.mjs
- [x] dashboard-deploy.sh
- [x] dashboard-watchdog.sh
- [x] nightly-build.sh
- [x] scripts/media-watcher.sh
- [x] scripts/x-bookmark-folders.mjs

---

## Acceptance Criteria

- [x] No hardcoded `/home/<user>` paths in any script
- [x] Scripts use self-location (`SCRIPT_DIR`) or `$HOME`
- [x] Scripts work regardless of username
- [x] All scripts tested after refactor (syntax checks passed, dashboard build succeeded)

---

## Benefits

- **Zero configuration** — no env vars to set up
- **Portable** — works for any user on any machine
- **Resilient** — scripts always know where they are
- **Simple** — standard Unix patterns, easy to understand
