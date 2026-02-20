#!/bin/bash
# run-bookmark-summarizer.sh - Wrapper script to run the bookmark summarizer as a cron job
# Suggested cron: */30 * * * * (every 30 minutes)

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."
tools/bookmark-summarizer.mjs >> /var/log/openclaw/bookmark-summarizer.log 2>&1
