# Refactor Hardcoded Paths — Self-Locating Scripts

**Status:** Draft  
**Author:** Kevin 🍌  
**Date:** 2026-02-19  

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
- [ ] cost-estimator.mjs
- [ ] spec-generator.mjs
- [ ] task-ack-loop.sh
- [ ] generate-db-schema.sh
- [ ] memory-rotate.sh
- [ ] generate-db-schema-html.sh
- [ ] kanban-watcher.mjs
- [ ] backup-openclaw.sh
- [ ] smaug-watchdog.sh

### oclaw-ops tools (`~/projects/oclaw-ops/tools/`)
- [ ] session-poller.mjs
- [ ] spawn-wrapper.mjs
- [ ] dashboard-deploy.sh
- [ ] dashboard-watchdog.sh
- [ ] nightly-build.sh
- [ ] scripts/media-watcher.sh
- [ ] scripts/x-bookmark-folders.mjs

---

## Acceptance Criteria

- [ ] No hardcoded `/home/<user>` paths in any script
- [ ] Scripts use self-location (`SCRIPT_DIR`) or `$HOME`
- [ ] Scripts work regardless of username
- [ ] All scripts tested after refactor

---

## Benefits

- **Zero configuration** — no env vars to set up
- **Portable** — works for any user on any machine
- **Resilient** — scripts always know where they are
- **Simple** — standard Unix patterns, easy to understand
