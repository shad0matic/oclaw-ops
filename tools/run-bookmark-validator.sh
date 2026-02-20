#!/bin/bash
# run-bookmark-validator.sh - Wrapper script to run the bookmark validator as a cron job
# Suggested cron: */15 * * * * (every 15 minutes)

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."
tools/bookmark-validator.mjs >> /var/log/openclaw/bookmark-validator.log 2>&1
