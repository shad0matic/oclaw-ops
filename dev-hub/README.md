# Dev Hub

Local dev control panel for the Atlas VPS — Tailscale-only.

## URL
`http://vps-ovh.tail404904.ts.net:4040/`

## What it does
- Lists all local dev projects with real-time pm2 status (uptime, memory)
- Start / Stop / Restart each project via buttons
- Auto-refreshes every 10s

## Stack
- Pure Node.js HTTP server (no dependencies) on port 4039
- Nginx on port 4040 proxies to it
- pm2 manages the server itself (`dev-hub` process)

## Projects managed
| Project | pm2 name | Ecosystem |
|---------|----------|-----------|
| OpenPeople Landing | openpeople-landing | ~/projects/openpeople/ecosystem.config.js |
| OpenPeople Game | openpeople-game | ~/projects/openpeople/ecosystem.config.js |
| OpenPeople API | openpeople-api | ~/projects/openpeople/ecosystem.config.js |
| Openator Web | openator-web | ~/projects/openator/ecosystem.config.js |
| Openator API | openator-api | ~/projects/openator/ecosystem.config.js |

## Setup from scratch
```bash
pm2 start ~/projects/dev-hub/server.js --name dev-hub
pm2 save
# Then add nginx config (see ~/projects/x-knowledge-base/landing/openpeople-dev.conf)
```

## Ports used
| Port | Service |
|------|---------|
| 4039 | Dev Hub Node server (internal) |
| 4040 | Dev Hub nginx (Tailscale-accessible) |
| 4043 | OpenPeople Landing nginx |
| 4044 | OpenPeople Game + API nginx |
| 3011 | openpeople-landing (serve) |
| 3012 | openpeople-game (serve) |
| 3020 | openpeople-api (NestJS) |
| 3030 | openator-api (NestJS) |
| 3031 | openator-web (serve) |
