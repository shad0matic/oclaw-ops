#!/bin/bash

# Exit on any error
set -e

# --- Configuration ---
REPO_URL="https://github.com/shad0matic/oclaw-ops.git"
PROJECT_DIR="oclaw-ops"

# --- Deployment ---

# 1. Clone the repository if it doesn't exist
if [ ! -d "$PROJECT_DIR" ]; then
  echo "Cloning repository..."
  git clone "$REPO_URL"
fi

# 2. Navigate to the project directory
cd "$PROJECT_DIR"

# 3. Build and start the services
echo "Building and starting services..."
docker-compose up -d --build

echo "Deployment complete."