#!/bin/bash

# Exit on any error
set -e

# --- Configuration ---
PROJECT_DIR="oclaw-ops"

# --- Update ---

# 1. Navigate to the project directory
if [ ! -d "$PROJECT_DIR" ]; then
  echo "Error: Project directory '$PROJECT_DIR' not found."
  echo "Please run the deploy.sh script first."
  exit 1
fi
cd "$PROJECT_DIR"

# 2. Pull the latest changes
echo "Pulling latest changes..."
git pull

# 3. Rebuild and restart the services
echo "Rebuilding and restarting services..."
docker-compose up -d --build

echo "Update complete."