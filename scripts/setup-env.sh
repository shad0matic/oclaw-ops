#!/bin/bash

# =============================================================================
# OpenClaw Ops - Environment Setup Script
# =============================================================================
# Initialize and configure environment for deployment
# Usage: ./setup-env.sh [environment]
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
ENVIRONMENT="${1:-development}"

# --- Functions ---
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

# --- Check Prerequisites ---
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not available"
        exit 1
    fi
    
    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        log_warning "pnpm is not installed. Installing..."
        npm install -g pnpm
    fi
    
    log_success "Prerequisites check passed"
}

# --- Create Directory Structure ---
create_directories() {
    log_info "Creating directory structure..."
    
    mkdir -p "$PROJECT_DIR/backups"
    mkdir -p "$PROJECT_DIR/logs"
    mkdir -p "$PROJECT_DIR/dashboard/.env.local"
    
    log_success "Directories created"
}

# --- Setup Environment File ---
setup_env_file() {
    log_info "Setting up environment file..."
    
    local TEMPLATE="$SCRIPT_DIR/templates/env.$ENVIRONMENT"
    local TARGET="$PROJECT_DIR/dashboard/.env"
    
    if [ -f "$TARGET" ]; then
        log_warning "Environment file already exists: $TARGET"
        read -p "Overwrite? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Skipping environment setup"
            return
        fi
    fi
    
    if [ -f "$TEMPLATE" ]; then
        cp "$TEMPLATE" "$TARGET"
        log_success "Environment file created from template"
        
        # Generate NEXTAUTH_SECRET if not set
        if ! grep -q "NEXTAUTH_SECRET" "$TARGET" || grep -q "CHANGE_THIS" "$TARGET"; then
            local SECRET=$(openssl rand -base64 32)
            sed -i "s|CHANGE_THIS_TO_A_STRONG_RANDOM_SECRET|$SECRET|g" "$TARGET"
            log_info "Generated NEXTAUTH_SECRET"
        fi
    else
        log_error "Template not found: $TEMPLATE"
        exit 1
    fi
}

# --- Generate Secrets ---
generate_secrets() {
    log_info "Generating secrets..."
    
    local ENV_FILE="$PROJECT_DIR/dashboard/.env"
    
    # Generate random passwords if needed
    if grep -q "password" "$ENV_FILE"; then
        local DB_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 20)
        sed -i "s|password=password|password=$DB_PASSWORD|g" "$ENV_FILE"
        log_success "Generated database password"
    fi
    
    # Generate JWT secret
    if ! grep -q "NEXTAUTH_SECRET" "$ENV_FILE" || grep -q "CHANGE_THIS" "$ENV_FILE"; then
        local JWT_SECRET=$(openssl rand -base64 32)
        echo "NEXTAUTH_SECRET=$JWT_SECRET" >> "$ENV_FILE"
        log_success "Generated NEXTAUTH_SECRET"
    fi
    
    log_success "Secrets generated"
}

# --- Install Dependencies ---
install_dependencies() {
    log_info "Installing dependencies..."
    
    cd "$PROJECT_DIR/dashboard"
    
    if [ -f "package.json" ]; then
        pnpm install
        log_success "Dependencies installed"
    else
        log_error "package.json not found"
        exit 1
    fi
    
    cd "$PROJECT_DIR"
}

# --- Initialize Database ---
init_database() {
    log_info "Initializing database..."
    
    cd "$PROJECT_DIR"
    
    # Start postgres
    docker compose up -d postgres
    
    # Wait for postgres
    log_info "Waiting for PostgreSQL..."
    local max_attempts=30
    local attempt=0
    
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
    
    # Run initial setup
    log_info "Running initial database setup..."
    
    cd "$PROJECT_DIR/dashboard"
    
    if [ -f "package.json" ] && grep -q "db:migrate" "package.json"; then
        pnpm db:migrate || log_warning "No migrations to run"
        pnpm db:seed || log_warning "No seed data"
    fi
    
    cd "$PROJECT_DIR"
    log_success "Database initialized"
}

# --- Main ---
main() {
    echo "============================================"
    echo "OpenClaw Ops - Environment Setup"
    echo "Environment: $ENVIRONMENT"
    echo "============================================"
    echo ""
    
    check_prerequisites
    create_directories
    setup_env_file
    generate_secrets
    install_dependencies
    init_database
    
    echo ""
    echo "============================================"
    log_success "Setup complete!"
    echo "============================================"
    echo ""
    echo "Next steps:"
    echo "  1. Review .env file: $PROJECT_DIR/dashboard/.env"
    echo "  2. Start services: ./scripts/service.sh start"
    echo "  3. Access dashboard: http://localhost:3000"
    echo ""
}

main "$@"
