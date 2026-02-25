# OpenClaw Ops - Deployment Scripts

This directory contains production-ready deployment scripts and templates for the OpenClaw Mission Control Dashboard.

## Scripts

### Core Deployment

| Script | Description |
|--------|-------------|
| `deploy.sh` | Main deployment script with pre-flight checks, migrations, and health verification |
| `rollback.sh` | Rollback to a previous database backup |
| `migrate.sh` | Run database migrations |
| `setup-env.sh` | Initial environment setup and configuration |

### Service Management

| Script | Description |
|--------|-------------|
| `service.sh` | Manage services (start, stop, restart, status, logs) |
| `monitor.sh` | Health monitoring with alerting |
| `backup.sh` | Database backup with retention |

## Quick Start

### 1. Initial Setup

```bash
# Run environment setup
./scripts/setup-env.sh production
```

### 2. Deploy

```bash
# Deploy to production
./scripts/deploy.sh production
```

### 3. Monitor

```bash
# Run health checks
./scripts/monitor.sh

# Continuous monitoring
./scripts/monitor.sh --continuous --alert
```

## Service Management

```bash
# Start all services
./scripts/service.sh start

# Start specific service
./scripts/service.sh start dashboard

# View status
./scripts/service.sh status

# View logs
./scripts/service.sh logs dashboard

# Restart
./scripts/service.sh restart
```

## Database Operations

```bash
# Run migrations
./scripts/migrate.sh up

# Create new migration
./scripts/migrate.sh create add_new_table

# Push schema changes
./scripts/migrate.sh push

# Check migration status
./scripts/migrate.sh status

# Backup database
./scripts/backup.sh

# Rollback to latest backup
./scripts/rollback.sh latest

# Rollback to specific version
./scripts/rollback.sh 20260225_120000
```

## Templates

Templates are stored in `scripts/templates/`:

| Template | Description |
|----------|-------------|
| `env.development` | Development environment variables |
| `env.staging` | Staging environment variables |
| `env.production` | Production environment variables |
| `docker-compose.prod.yml` | Production Docker Compose override |
| `nginx.conf` | Nginx reverse proxy configuration |
| `openclaw-dashboard.service` | Systemd service file |
| `env.schema.json` | Environment validation schema |

## Configuration

### Environment Variables

Copy the appropriate template and customize:

```bash
cp scripts/templates/env.production dashboard/.env
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - NextAuth secret (auto-generated)
- `NEXTAUTH_URL` - Production URL

### Backup Configuration

```bash
# Custom backup directory
export BACKUP_DIR=/path/to/backups

# Custom retention (days)
export RETENTION_DAYS=14

# Run backup
./scripts/backup.sh
```

### Monitoring Configuration

Edit `monitor.sh` to add alerting:

```bash
# Add Telegram alerting
ALERT_ON_FAILURE=true
BOT_TOKEN="your-bot-token"
CHAT_ID="your-chat-id"
```

## Production Deployment

1. **Setup environment:**
   ```bash
   ./scripts/setup-env.sh production
   ```

2. **Deploy:**
   ```bash
   ./scripts/deploy.sh production
   ```

3. **Configure Nginx:**
   ```bash
   sudo cp scripts/templates/nginx.conf /etc/nginx/sites-available/openclaw
   sudo ln -s /etc/nginx/sites-available/openclaw /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **Enable automatic backups (cron):**
   ```bash
   # Daily backup at 2 AM
   0 2 * * * /path/to/oclaw-ops/scripts/backup.sh
   ```

5. **Enable monitoring (cron):**
   ```bash
   # Check every 5 minutes
   */5 * * * * /path/to/oclaw-ops/scripts/monitor.sh
   ```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
./scripts/service.sh logs

# Check status
./scripts/service.sh status

# Restart services
./scripts/service.sh restart
```

### Database Connection Failed

```bash
# Check PostgreSQL
docker compose logs postgres

# Restart PostgreSQL
./scripts/service.sh restart postgres
```

### Migration Failed

```bash
# Check migration status
./scripts/migrate.sh status

# Try pushing schema
./scripts/migrate.sh push
```

### Need to Rollback

```bash
# List available backups
ls -la backups/

# Rollback to latest
./scripts/rollback.sh latest

# Rollback to specific version
./scripts/rollback.sh 20260225_120000
```

## License

MIT
