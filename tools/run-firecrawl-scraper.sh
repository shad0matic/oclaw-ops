#!/bin/bash
# Run Firecrawl scraper with environment from .env.task-listener if available

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load environment variables if .env file exists
if [ -f "$SCRIPT_DIR/../.env.task-listener" ]; then
  set -a
  source "$SCRIPT_DIR/../.env.task-listener"
  set +a
fi

# Run the scraper with all arguments
exec node "$SCRIPT_DIR/firecrawl-scraper.mjs" "$@"
