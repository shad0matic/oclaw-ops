# Refactor Hardcoded Paths to Env Vars

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

Replace hardcoded paths with a combination of:
1. **Self-locating scripts** — derive paths from script location
2. **`$HOME` variable** — for user-relative paths
3. **Optional `OPENCLAW_HOME`** — override if non-standard location

---

## Pattern

### For bash scripts:
```bash
#!/bin/bash
# Self-locate
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(dirname "$SCRIPT_DIR")"
OPENCLAW_DIR="${OPENCLAW_HOME:-$HOME/.openclaw}"

# Derived paths
BACKUP_DIR="$HOME/backups/openclaw"
PROJECTS_DIR="$HOME/projects"
```

### For Node.js scripts:
```javascript
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKSPACE_DIR = dirname(__dirname);
const OPENCLAW_DIR = process.env.OPENCLAW_HOME || join(process.env.HOME, '.openclaw');
```

---

## Files to Update

### Workspace scripts (`~/.openclaw/workspace/scripts/`)
- [x] task-ack-watcher.sh (already fixed)
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
- [ ] Scripts work regardless of username
- [ ] `OPENCLAW_HOME` env var optionally overrides default location
- [ ] All scripts tested after refactor

---

## Testing

```bash
# Verify no hardcoded paths remain
grep -r "/home/openclaw" ~/.openclaw/workspace/scripts/ 
grep -r "/home/openclaw" ~/projects/oclaw-ops/tools/

# Should return empty or only comments explaining the pattern
```
