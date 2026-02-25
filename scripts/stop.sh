#!/bin/bash

# Exit on any error
set -e

# --- Configuration ---
PROJECT_DIR="oclaw-ops"

# --- Stop ---

# 1. Navigate to the project directory
if [ ! -d "$PROJECT_DIR" ]; then
  echo "Error: Project directory '$PROJECT_DIR' not found."
  exit 1
fi
cd "$PROJECT_DIR"

# 2. Stop the services
echo "Stopping services..."
docker-compose down

echo "Services stopped."