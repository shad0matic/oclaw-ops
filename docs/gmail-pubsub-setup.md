# Gmail + Calendar + Drive Access for Kevin via gog + OpenClaw Webhooks

**Goal:** Kevin gets real-time email/calendar notifications via Google Pub/Sub + Google Drive access for file sharing, using `gog` CLI (gogcli) + OpenClaw's built-in Gmail webhook wizard.

**Time estimate:** ~1-2h

---

## Architecture

```
Gmail/Calendar → Google Pub/Sub → gog watch serve (localhost:8788) → OpenClaw hook → Kevin processes
Google Drive → gog drive commands → Kevin reads/writes files
```

Tailscale Funnel exposes the local gog server to the internet so Google Pub/Sub can reach it.

---

## Prerequisites

- Kevin's Gmail account (e.g. `kevin.minion.bot@gmail.com`)
- Google Cloud project (free tier)
- Tailscale installed on VPS (for Funnel)

---

## Step 1 — Create Kevin's Gmail account

1. Go to https://accounts.google.com/signup
2. Create the account (phone verification needed)
3. Pass credentials to Kevin via TUI (never Telegram)

---

## Step 2 — Install gog CLI

```bash
# Install via Homebrew (or see https://gogcli.sh for alternatives)
brew install steipete/tap/gog

# Or via npm
npm install -g gogcli

# Verify
gog --version
```

---

## Step 3 — Create Google Cloud project + OAuth

### 3a. Create project

1. Go to https://console.cloud.google.com/
2. Sign in with Kevin's Gmail
3. **Select project** → **New Project**
   - Name: `kevin-openclaw`
   - Click **Create**

### 3b. Enable APIs

Go to **APIs & Services → Library**, enable:
- **Gmail API**
- **Google Calendar API**
- **Google Drive API**
- **Cloud Pub/Sub API**

### 3c. Create OAuth consent screen

1. **APIs & Services → OAuth consent screen**
2. User type: **External**
3. Fill in:
   - App name: `Kevin OpenClaw`
   - User support email: Kevin's Gmail
   - Developer contact: your email
4. Scopes: skip for now (gog handles this)
5. Test users: add Kevin's Gmail + your personal Gmail
6. **Publish to production** when ready (avoids 7-day token expiry for test apps)

### 3d. Create OAuth credentials

1. **APIs & Services → Credentials → + Create Credentials → OAuth client ID**
2. Application type: **Desktop app** (gog uses desktop flow)
3. Name: `gog-kevin`
4. Click **Create**
5. **Download JSON** → save as `client_secret.json`

---

## Step 4 — Authenticate gog

```bash
# Point gog to your OAuth credentials
export GOG_CLIENT_ID="your-client-id"
export GOG_CLIENT_SECRET="your-client-secret"

# Or place client_secret.json in gog's config dir:
# ~/.config/gog/client_secret.json

# Add Kevin's Gmail account to gog (gmail + calendar + drive)
gog auth add kevin.minion.bot@gmail.com --services gmail,calendar,drive

# This opens a browser for OAuth consent
# Sign in as Kevin, grant Gmail + Calendar access
# gog stores the refresh token locally
```

Verify it works:
```bash
gog gmail messages list --account kevin.minion.bot@gmail.com --max 5
gog gcal events list --account kevin.minion.bot@gmail.com
gog drive list --account kevin.minion.bot@gmail.com
```

**If you already authed without drive**, re-run with `--force-consent`:
```bash
gog auth add kevin.minion.bot@gmail.com --services gmail,calendar,drive --force-consent
```

---

## Step 5 — Set up Tailscale Funnel

Google Pub/Sub needs a public HTTPS endpoint to push notifications. Tailscale Funnel exposes a local port securely.

```bash
# Check Tailscale is running
tailscale status

# Enable Funnel for the VPS (one-time, in Tailscale admin or CLI)
tailscale funnel 8788
```

This gives you a public URL like: `https://vps-761ce0cf.tail12345.ts.net:8788/gmail-pubsub`

Note this URL — you'll need it for the Pub/Sub push endpoint.

**Alternative:** If you prefer using `webhook.glubi.com`, set up Nginx to proxy to localhost:8788 instead of Tailscale Funnel. Both work.

---

## Step 6 — Set up Pub/Sub + Gmail watch (via gog)

```bash
# Create Pub/Sub topic + subscription + register Gmail watch
gog gmail track setup --account kevin.minion.bot@gmail.com
```

This single command:
- Creates the Pub/Sub topic (`gog-gmail-watch`)
- Creates the push subscription pointing to your endpoint
- Grants Gmail the Publisher role on the topic
- Registers the Gmail watch

Follow the prompts — it will ask for your GCP project ID and push endpoint URL.

---

## Step 7 — Use OpenClaw's built-in wizard

OpenClaw has a dedicated integration for this:

```bash
# Interactive setup: connects gog → OpenClaw hooks
openclaw webhooks gmail setup \
  --account kevin.minion.bot@gmail.com \
  --project kevin-openclaw \
  --tailscale funnel
```

This configures:
- gog watch serve on `localhost:8788`
- Tailscale Funnel to expose it
- OpenClaw webhook hook to process incoming emails
- Auto-renewal of Gmail watch (every 12h by default)

---

## Step 8 — Run the webhook server

```bash
# Start gog watch server + auto-renew loop
openclaw webhooks gmail run \
  --account kevin.minion.bot@gmail.com
```

For production, run this as a **systemd service** so it survives reboots:

```bash
# Create systemd user service
cat > ~/.config/systemd/user/gog-gmail-watch.service << 'EOF'
[Unit]
Description=gog Gmail watch server (Pub/Sub → OpenClaw)
After=network.target

[Service]
ExecStart=/usr/local/bin/openclaw webhooks gmail run --account kevin.minion.bot@gmail.com
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now gog-gmail-watch.service
```

---

## Step 9 — Calendar (same infra)

gog handles both email + calendar. Calendar watch uses the same Pub/Sub infrastructure:

```bash
gog gcal track setup --account kevin.minion.bot@gmail.com
```

---

## Step 10 — Google Drive setup

Kevin's Drive is ready to use after auth. Useful commands:

```bash
# List files
gog drive list --account kevin.minion.bot@gmail.com

# Upload a file
gog drive upload --account kevin.minion.bot@gmail.com /path/to/file.pdf

# Download a file
gog drive download --account kevin.minion.bot@gmail.com --id <file-id>

# Create a shared folder
gog drive mkdir --account kevin.minion.bot@gmail.com "Shared with Boss"
```

**Sharing with Boss:**
1. Kevin creates a folder in his Drive
2. Shares it with your personal Gmail (edit access)
3. Both can read/write files there
4. Alternative to `drop.glubi.com` for persistent file sharing

---

## Step 12 — Share calendar with Kevin

On **your personal Google account**:
1. Go to https://calendar.google.com/calendar/r/settings
2. Find your calendar → **Share with specific people**
3. Add Kevin's Gmail → permission: **Make changes to events**
4. Kevin can now read/write your calendar

---

## Step 13 — Test

1. Send an email to Kevin's Gmail
2. Within seconds, Kevin should receive the notification
3. Check: `openclaw webhooks gmail run` logs should show the incoming push
4. Kevin processes the email and can alert you on Telegram

---

## Checklist

- [x] Create Kevin's Gmail account (kevin.ovilclaw@gmail.com)
- [x] Install gog CLI (v0.9.0 via Homebrew)
- [x] Create Google Cloud project (`kevin-openclaw`)
- [x] Enable Gmail + Calendar + Drive + Pub/Sub APIs
- [x] Create OAuth consent screen
- [x] Create OAuth credentials (Desktop app)
- [x] Run `gog auth add` with gmail,calendar,drive services
- [x] Set up Tailscale Funnel
- [x] Run `gog gmail track setup`
- [x] Run `openclaw webhooks gmail setup`
- [x] Create systemd service for `openclaw webhooks gmail run`
- [x] Test: send email → Kevin gets notified ✅
- [x] Test: Kevin sends email → Boss receives ✅
- [ ] Share your calendar with Kevin's Gmail
- [ ] Test: create calendar event → Kevin sees it
- [ ] Set up shared Drive folder between Kevin and Boss
- [ ] Test: upload file to Drive → Boss can access it

---

## Cost

- Google Cloud Pub/Sub: **free tier** (10GB/month)
- Gmail API + Calendar API + Drive API: **free** (within quota, 15GB Drive storage free)
- Tailscale Funnel: **free** (included in Tailscale plan)
- gog CLI: **free** (open source)
- **Total: €0/mo**

---

## Maintenance

- Gmail watch auto-renews via `openclaw webhooks gmail run` (every 12h)
- OAuth refresh token auto-renews
- If token expires: re-run `gog auth add`
- Monitor: `systemctl --user status gog-gmail-watch`
