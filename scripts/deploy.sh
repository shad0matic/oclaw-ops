#!/bin/bash

# =============================================================================
# OpenClaw Ops - Enhanced Deployment Script
# =============================================================================
# Production-ready deployment with validation, migrations, and health checks
# Usage: ./deploy.sh [environment] [--skip-migrations] [--skip-healthcheck]
# =============================================================================

set -e

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# --- Configuration ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-production}"
SKIP_MIGRATIONS=false
SKIP_HEALTHCHECK=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --skip-migrations)
            SKIP_MIGRATIONS=true
            shift
            ;;
        --skip-healthcheck)
            SKIP_HEALTHCHECK=true
            shift
            ;;
    esac
done

# --- Functions ---
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

# --- Pre-deployment Checks ---
preflight_checks() {
    log_info "Running pre-flight checks..."
    
    # Check Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose is available
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not available"
        exit 1
    fi
    
    # Check required files exist
    if [ ! -f "$PROJECT_DIR/docker-compose.yml" ]; then
        log_error "docker-compose.yml not found"
        exit 1
    fi
    
    # Check environment file exists
    ENV_FILE="$PROJECT_DIR/scripts/templates/env.$ENVIRONMENT"
    if [ ! -f "$ENV_FILE" ]; then
        log_warning "Environment file not found: $ENV_FILE"
        log_info "Using default configuration"
    fi
    
    # Check disk space (minimum 2GB free)
    AVAILABLE_SPACE=$(df -BG "$PROJECT_DIR" | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$AVAILABLE_SPACE" -lt 2 ]; then
        log_error "Insufficient disk space: ${AVAILABLE_SPACE}GB available"
        exit 1
    fi
    
    log_success "Pre-flight checks passed"
}

# --- Database Setup ---
setup_database() {
    log_info "Setting up database..."
    
    # Wait for PostgreSQL to be ready
    log_info "Waiting for PostgreSQL..."
    max_attempts=30
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker compose exec -T postgres pg_isready -U shad &> /dev/null; then
            log_success "PostgreSQL is ready"
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        log_error "PostgreSQL failed to start"
        exit 1
    fi
    
    # Run migrations if not skipped
    if [ "$SKIP_MIGRATIONS" = false ]; then
        log_info "Running database migrations..."
        cd "$PROJECT_DIR/dashboard"
        
        if [ -f "package.json" ] && grep -q "db:migrate" "package.json"; then
            # Check if dependencies are installed
            if [ ! -d "node_modules" ]; then
                log_info "Installing dependencies..."
                pnpm install
            fi
            
            # Run migrations
            if pnpm db:migrate; then
                log_success "Database migrations completed"
            else
                log_warning "Migration failed or no migrations to run"
            fi
        fi
        
        cd "$PROJECT_DIR"
    else
        log_warning "Skipping database migrations"
    fi
}

# --- Build & Deploy ---
deploy_services() {
    log_info "Building and deploying services..."
    
    cd "$PROJECT_DIR"
    
    # Pull latest images first
    log_info "Pulling latest images..."
    docker compose pull || true
    
    # Build with no cache to ensure fresh build
    log_info "Building containers..."
    docker compose build --no-cache
    
    # Stop existing containers
    log_info "Stopping existing containers..."
    docker compose down || true
    
    # Start services
    log_info "Starting services..."
    docker compose up -d
    
    log_success "Services deployed"
}

# --- Health Checks ---
health_checks() {
    if [ "$SKIP_HEALTHCHECK" = true ]; then
        log_warning "Skipping health checks"
        return
    fi
    
    log_info "Running health checks..."
    
    # Wait for dashboard to be ready
    log_info "Checking dashboard availability..."
    max_attempts=30
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf http://localhost:3000/health &> /dev/null || curl -sf http://localhost:3000/api/health &> /dev/null; then
            log_success "Dashboard is healthy"
            break
        fi
        attempt=$((attempt + 1))
        log_info "Waiting for dashboard... ($attempt/$max_attempts)"
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        log_warning "Dashboard health check failed - may need manual verification"
        return
    fi
    
    # Check database connectivity
    log_info "Checking database connectivity..."
    if docker compose exec -T postgres pg_isready -U shad &> /dev/null; then
        log_success "Database is healthy"
    else
        log_warning "Database health check failed"
    fi
    
    # Show service status
    log_info "Service status:"
    docker compose ps
    
    log_success "Health checks completed"
}

# --- Cleanup ---
cleanup() {
    log_info "Cleaning up old images and volumes..."
    
    # Remove dangling images
    docker image prune -f
    
    # Clean up old logs
    find "$PROJECT_DIR" -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    log_success "Cleanup completed"
}

# --- Main ---
main() {
    echo "============================================"
    echo "OpenClaw Ops - Deployment Script"
    echo "Environment: $ENVIRONMENT"
    echo "============================================"
    echo ""
    
    preflight_checks
    setup_database
    deploy_services
    health_checks
    cleanup
    
    echo ""
    echo "============================================"
    log_success "Deployment complete!"
    echo "============================================"
    echo ""
    echo "Dashboard: http://localhost:3000"
    echo "Gateway:   http://localhost:8080"
    echo ""
    echo "View logs: docker compose logs -f"
    echo "Stop:      docker compose down"
    echo ""
}

main "$@"
