#!/bin/bash
#
# Wrapper script to run the Kanban Comment Watcher.
# This script simply executes the Node.js process directly.
#

# Get the directory of this script to reliably find the project root
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
WATCHER_SCRIPT="$SCRIPT_DIR/kanban-comment-watcher.mjs"

echo "Starting Kanban Comment Watcher..."
echo "Launching script: $WATCHER_SCRIPT"

# Execute the Node.js script, replacing the shell process
exec node "$WATCHER_SCRIPT"
