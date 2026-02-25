# OpenClaw Mac Setup Guide

> Complete guide to connecting your Mac to the OpenClaw AI agent system

## Overview

OpenClaw is an AI assistant system running on a Linux VPS, accessible via:
- **Telegram** — Primary chat interface
- **Mission Control Dashboard** — Web-based monitoring and control
- **Browser Extension** — For automation and screen capture

This guide walks you through setting up your Mac to use OpenClaw.

---

## Prerequisites

### Required
- **Mac running macOS 12 (Monterey) or later**
- **Tailscale account** — Required for secure dashboard access
- **Telegram account** — For chat interface

### Optional (for advanced features)
- **ElevenLabs account** — Custom TTS voices
- **Chrome browser** — For browser extension automation

---

## Step 1: Install Node.js

OpenClaw requires Node.js 24+. Install via Homebrew:

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js 24
brew install node@24
```

Verify installation:
```bash
node --version  # Should be v24.x.x
npm --version
```

---

## Step 2: Install OpenClaw CLI

```bash
npm install -g openclaw
```

Verify installation:
```bash
openclaw --version
```

You should see: `🦞 OpenClaw 2026.x.x`

---

## Step 3: Install & Configure Tailscale

Tailscale provides secure access to the Mission Control Dashboard without exposing it to the public internet.

### Install Tailscale

```bash
brew install tailscale
```

### Connect to OpenClaw Network

```bash
tailscale up
```

**Important:** You'll need to authenticate with your Tailscale account. The OpenClaw VPS is already on the Tailscale network — ask Kevin (via Telegram) to approve your machine or send you an invite link.

### Verify Connection

```bash
tailscale status
```

You should see your Mac listed along with the OpenClaw VPS (likely named `vps-xxx` or similar).

---

## Step 4: Configure Telegram Access

### Get Your Telegram ID

1. Open Telegram and search for `@userinfobot`
2. Start a chat and it will display your user ID (a numeric string)

### Share Your ID with Kevin

Send your Telegram ID to Kevin via Telegram and ask to be added to the OpenClaw access list.

### Verify Telegram Connection

Once added, you should be able to find and message the OpenClaw bot in Telegram.

---

## Step 5: Access Mission Control Dashboard

The dashboard provides real-time monitoring of the OpenClaw system.

### Access via Tailscale

Once Tailscale is connected, access the dashboard at:

```
https://vps-ovh.tail404904.ts.net/
```

> **Note:** The exact URL may vary. Ask Kevin for your dashboard URL.

### What You Can Do

- **Overview** — System status, KPIs, active agents
- **Agents** — View agent roster, performance reviews
- **Workflows** — Trigger and monitor automated tasks
- **Runs** — Track workflow execution history
- **Memory** — Search and browse agent memories
- **System** — Server health metrics

---

## Step 6: Browser Extension (Optional)

For screen capture, automation, and node features:

### Install Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Ask Kevin for the extension file or check with the team

### Configure Extension

1. Click the OpenClaw extension icon in Chrome
2. Enter the Tailscale URL when prompted
3. Authenticate with your Telegram session

### Features

- **Screen Capture** — Take screenshots for the agent
- **Tab Management** — Agent can read/control browser tabs
- **Automation** — Fill forms, click elements

---

## Step 7: Voice/TTS (Optional)

OpenClaw supports text-to-speech via ElevenLabs.

### Prerequisites

1. Create an account at [elevenlabs.io](https://elevenlabs.io/)
2. Get your API key from the dashboard

### Configure Voice

Ask Kevin to enable TTS and set your preferred voice. Common voices:
- **The Elf** — Friendly, slightly magical
- **Rachel** — Clear, professional
- **Adam** — Deep, authoritative

---

## Common Issues & Troubleshooting

### "Command not found: openclaw"

```bash
# Ensure npm global bin is in your PATH
export PATH="$(npm config get prefix)/bin:$PATH"

# Add to your shell profile for permanence
echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Can't access dashboard

1. **Check Tailscale status:**
   ```bash
   tailscale status
   ```

2. **Reconnect if needed:**
   ```bash
   tailscale down
   tailscale up
   ```

3. **Check URL** — Confirm you're using the correct Tailscale URL

### Telegram not responding

1. **Check your Telegram ID** — Make sure it's correct
2. **Verify access** — Ask Kevin if you're on the allowlist
3. **Try /start** — Send `/start` to the OpenClaw bot

### Node.js version too old

```bash
# Check your version
node --version

# If below v24, upgrade
brew upgrade node@24
# or
brew install node@24
```

### Permission errors

```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc
```

---

## Quick Reference

### Essential Commands

| Command | Description |
|---------|-------------|
| `openclaw --version` | Check OpenClaw version |
| `openclaw health` | Check gateway health |
| `openclaw dashboard` | Open dashboard in browser |
| `openclaw docs` | Search OpenClaw documentation |
| `openclaw doctor` | Run health checks |

### Access Points

| Service | URL/Method |
|---------|------------|
| Telegram | Search for OpenClaw bot |
| Dashboard | `https://vps-ovh.tail404904.ts.net/` |
| Gateway | `ws://vps-ovh.tail404904.ts.net:19001` |

---

## Next Steps

Once set up, you can:

1. **Chat with Kevin** — Your primary AI assistant
2. **Trigger workflows** — Automated tasks via dashboard
3. **Browse memories** — See what the agent remembers
4. **Monitor system** — Track agent activity and costs

---

## Support

- **Telegram** — Message Kevin directly
- **Dashboard** — Check the Events feed for activity
- **Run diagnostics** — `openclaw doctor`

---

*Last updated: February 2026*
