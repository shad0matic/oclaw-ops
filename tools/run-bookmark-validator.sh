#!/bin/bash
# run-bookmark-validator.sh - Wrapper script to run the bookmark validator as a cron job
# Suggested cron: */15 * * * * (every 15 minutes)

cd /home/openclaw/projects/oclaw-ops
tools/bookmark-validator.mjs >> /var/log/openclaw/bookmark-validator.log 2>&1
