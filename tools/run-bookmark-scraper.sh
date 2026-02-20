#!/bin/bash
# run-bookmark-scraper.sh - Wrapper script to run the bookmark scraper as a cron job
# Suggested cron: */15 * * * * (every 15 minutes, offset by 5 minutes from validator)

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."
tools/bookmark-scraper.mjs >> /var/log/openclaw/bookmark-scraper.log 2>&1
