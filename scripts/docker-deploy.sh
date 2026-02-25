#!/bin/bash

# =============================================================================
# OpenClaw Ops - Docker Deployment Script
# =============================================================================
# Full-featured deployment script with backup, build, and health checks
# Usage: ./docker-deploy.sh [environment]
# =============================================================================

set -e

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-production}"

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# --- Functions ---
log_info() { echo -e "${YELLOW}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# --- Main ---
echo "============================================"
echo "OpenClaw Ops - Docker Deployment"
echo "============================================"
echo ""
log_info "Environment: $ENVIRONMENT"
echo ""

cd "$PROJECT_DIR"

# Step 1: Pre-deployment backup
log_step "1/5 - Creating pre-deployment backup..."
if [ -f "$SCRIPT_DIR/pre-deploy-backup.sh" ]; then
    bash "$SCRIPT_DIR/pre-deploy-backup.sh"
else
    log_info "Skipping backup (script not found)"
fi

# Step 2: Load environment-specific overrides
log_step "2/5 - Loading environment configuration..."
if [ -f "$SCRIPT_DIR/templates/docker-compose.$ENVIRONMENT.yml" ]; then
    cp "$SCRIPT_DIR/templates/docker-compose.$ENVIRONMENT.yml" docker-compose.override.yml
    log_success "Loaded docker-compose.$ENVIRONMENT.yml"
else
    log_info "No override file for environment: $ENVIRONMENT"
    rm -f docker-compose.override.yml
fi

# Step 3: Pull latest images
log_step "3/5 - Pulling latest images..."
docker-compose pull

# Step 4: Build and start containers
log_step "4/5 - Building and starting containers..."
docker-compose up -d --build

# Step 5: Health check
log_step "5/5 - Running health check..."
sleep 10
if bash "$SCRIPT_DIR/healthcheck.sh"; then
    log_success "Deployment completed successfully!"
else
    log_error "Health check failed!"
    echo ""
    log_info "Logs:"
    docker-compose logs --tail=50
    exit 1
fi

echo ""
log_success "All done! Dashboard available at http://localhost:3000"
