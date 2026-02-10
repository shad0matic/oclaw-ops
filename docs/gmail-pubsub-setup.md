# Gmail + Calendar Access for Kevin via Google Pub/Sub

**Goal:** Kevin gets notified in real-time when emails arrive or calendar events change, via Google Cloud Pub/Sub webhooks. No polling needed.

---

## Architecture

```
Gmail/Calendar → Google Pub/Sub → HTTPS webhook → Kevin's VPS → process & respond
```

- Gmail sends push notifications to a Pub/Sub topic when new mail arrives
- Calendar sends push notifications when events change
- A Pub/Sub push subscription forwards messages to our webhook endpoint
- Kevin processes the notification and acts (read email, check calendar, alert Boss)

---

## Prerequisites

- A Google account for Kevin (e.g. `kevin.minion.bot@gmail.com`) — **you need to create this first**
- A Google Cloud project (free tier is enough)
- A public HTTPS endpoint on the VPS (we'll use Nginx + Let's Encrypt on a subdomain)

---

## Step-by-step guide

### Step 1 — Create Kevin's Gmail account

1. Go to https://accounts.google.com/signup
2. Create: `kevin.minion.bot@gmail.com` (or whatever is available)
3. Complete phone verification
4. Save credentials securely (pass them to Kevin via TUI, never Telegram)

### Step 2 — Create a Google Cloud project

1. Go to https://console.cloud.google.com/
2. Sign in with **Kevin's Gmail** (or your own — both work, but Kevin's is cleaner)
3. Click **Select a project** → **New Project**
   - Name: `kevin-openclaw`
   - Click **Create**
4. Make sure the new project is selected in the top dropdown

### Step 3 — Enable required APIs

In the Google Cloud Console, go to **APIs & Services → Library** and enable:

1. **Gmail API** — search "Gmail API" → click → **Enable**
2. **Google Calendar API** — search "Google Calendar API" → click → **Enable**
3. **Cloud Pub/Sub API** — search "Cloud Pub/Sub" → click → **Enable**

### Step 4 — Create OAuth 2.0 credentials

1. Go to **APIs & Services → Credentials**
2. Click **+ Create Credentials → OAuth client ID**
3. If prompted, configure the **OAuth consent screen** first:
   - User type: **External** (even for personal use)
   - App name: `Kevin OpenClaw`
   - User support email: Kevin's Gmail
   - Developer contact email: your email
   - Click **Save and Continue** through scopes (we'll add them later)
   - Add **test users**: Kevin's Gmail + your personal Gmail
   - Click **Save**
4. Back to **Credentials → + Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Name: `kevin-vps`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google` (for local OAuth flow)
   - Also add: `https://kevin.glubi.com/api/auth/callback/google` (if you plan a public endpoint)
   - Click **Create**
5. **Download the JSON** → save as `client_secret.json`
6. Note the **Client ID** and **Client Secret**

### Step 5 — Create a Pub/Sub topic

1. Go to **Pub/Sub → Topics** in Cloud Console
2. Click **+ Create Topic**
   - Topic ID: `gmail-notifications`
   - Leave defaults
   - Click **Create**
3. Full topic name will be: `projects/kevin-openclaw/topics/gmail-notifications`

### Step 6 — Grant Gmail permission to publish

Gmail needs permission to publish to your Pub/Sub topic.

1. Go to **Pub/Sub → Topics → gmail-notifications**
2. Click the **Permissions** tab (or the checkbox + "Show Info Panel")
3. Click **Add Principal**
   - New principal: `gmail-api-push@system.gserviceaccount.com`
   - Role: **Pub/Sub Publisher**
   - Click **Save**

### Step 7 — Create a push subscription

This tells Pub/Sub to forward notifications to your VPS via HTTPS.

1. Go to **Pub/Sub → Subscriptions**
2. Click **+ Create Subscription**
   - Subscription ID: `gmail-push-to-vps`
   - Select topic: `gmail-notifications`
   - Delivery type: **Push**
   - Endpoint URL: `https://webhook.glubi.com/google/push` (we'll set this up next)
   - Acknowledgement deadline: 30 seconds
   - Click **Create**

### Step 8 — Set up the webhook endpoint on VPS

You need a public HTTPS endpoint. Options:

**Option A: Subdomain + Nginx + Let's Encrypt (recommended)**

1. Point DNS: `webhook.glubi.com` → VPS IP (A record)
2. Install certbot if not already: `sudo apt install certbot python3-certbot-nginx`
3. Create Nginx config:

```nginx
# /etc/nginx/sites-available/webhook.glubi.com
server {
    listen 80;
    server_name webhook.glubi.com;

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

4. Enable + get cert:
```bash
sudo ln -s /etc/nginx/sites-available/webhook.glubi.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo nginx -s reload
sudo certbot --nginx -d webhook.glubi.com
```

5. Kevin will run a small webhook server on port 3100 (we'll build this).

**Option B: Use the dashboard's Next.js API routes**

If the dashboard is already public on a subdomain, add `/api/google/push` as an API route. Simpler but couples the webhook to the dashboard.

### Step 9 — Run the OAuth flow (one-time)

This gets Kevin a refresh token to access Gmail/Calendar.

On the VPS, create a small script to do the OAuth dance:

```bash
# Install helper
cd /home/shad/projects/oclaw-ops
npm install googleapis

# Run OAuth flow
node tools/google-oauth.mjs
```

The script will:
1. Open a URL in your browser (or print it for you to paste)
2. You sign in as Kevin's Gmail
3. Grant permissions (Gmail read/send, Calendar read/write)
4. It exchanges the code for tokens
5. Saves `google-tokens.json` to a safe location

**Scopes to request:**
```
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/calendar.events
https://mail.google.com/  (for Pub/Sub watch)
```

### Step 10 — Set up Gmail watch (Pub/Sub registration)

After OAuth, call the Gmail watch API to start receiving notifications:

```javascript
// Called once, then re-register every 7 days (Gmail watch expires)
const gmail = google.gmail({ version: 'v1', auth: oauthClient });
await gmail.users.watch({
  userId: 'me',
  requestBody: {
    topicName: 'projects/kevin-openclaw/topics/gmail-notifications',
    labelIds: ['INBOX'],
  },
});
```

Set up a **cron job** to re-register the watch every 6 days (it expires after 7):
```
0 8 */6 * * node /home/shad/projects/oclaw-ops/tools/google-watch-renew.mjs
```

### Step 11 — Calendar push notifications

Similar to Gmail, but uses the Calendar API's watch mechanism:

```javascript
const calendar = google.calendar({ version: 'v3', auth: oauthClient });
await calendar.events.watch({
  calendarId: 'primary',
  requestBody: {
    id: 'kevin-calendar-watch-' + Date.now(),
    type: 'web_hook',
    address: 'https://webhook.glubi.com/google/calendar',
    // Channel expires, renew periodically
  },
});
```

---

## Webhook message format

When Gmail sends a push notification, Pub/Sub delivers a POST to your endpoint:

```json
{
  "message": {
    "data": "eyJlbWFpbEFkZHJlc3MiOiJ1c2VyQGV4YW1wbGUuY29tIiwiaGlzdG9yeUlkIjoiMTIzNDU2Nzg5MCJ9",
    "messageId": "1234567890",
    "publishTime": "2026-02-10T12:00:00Z"
  },
  "subscription": "projects/kevin-openclaw/subscriptions/gmail-push-to-vps"
}
```

The `data` field is base64-encoded JSON containing:
- `emailAddress` — the mailbox
- `historyId` — use this to fetch new messages since last check

Your webhook should:
1. Decode the `data`
2. Call `gmail.users.history.list({ startHistoryId })` to get new messages
3. Process and respond (alert Boss, save to memory, etc.)
4. Return HTTP 200 (acknowledge) — if you don't, Pub/Sub retries

---

## Files to create (Kevin will build these)

| File | Purpose |
|------|---------|
| `tools/google-oauth.mjs` | One-time OAuth flow, saves refresh token |
| `tools/google-watch-renew.mjs` | Re-registers Gmail watch (cron every 6 days) |
| `tools/google-webhook-server.mjs` | Express server on port 3100, receives Pub/Sub pushes |
| `dashboard/src/app/api/google/push/route.ts` | Alternative: webhook as Next.js API route |

---

## Cost

- **Google Cloud Pub/Sub:** Free tier covers 10GB/month of messages (more than enough)
- **Gmail API:** Free (within quota — 250 units/sec for personal use)
- **Calendar API:** Free (within quota)
- **Certbot/Let's Encrypt:** Free
- **Total: €0/mo**

---

## Security notes

- OAuth tokens stored locally on VPS only (gitignored)
- Webhook endpoint should verify Pub/Sub message authenticity (check `Authorization` header or message signature)
- Gmail watch only monitors inbox (not sent, trash, etc.)
- Refresh token auto-renews; if it expires, re-run OAuth flow

---

## Checklist

- [ ] Create Kevin's Gmail account
- [ ] Create Google Cloud project (`kevin-openclaw`)
- [ ] Enable Gmail + Calendar + Pub/Sub APIs
- [ ] Create OAuth credentials (Web app)
- [ ] Create Pub/Sub topic (`gmail-notifications`)
- [ ] Grant `gmail-api-push@system.gserviceaccount.com` Publisher role
- [ ] Create push subscription → `https://webhook.glubi.com/google/push`
- [ ] Set up DNS: `webhook.glubi.com` → VPS IP
- [ ] Nginx + Let's Encrypt for webhook subdomain
- [ ] Run OAuth flow, save tokens
- [ ] Register Gmail watch
- [ ] Register Calendar watch
- [ ] Set up 6-day cron for watch renewal
- [ ] Test: send email to Kevin → notification arrives → Kevin processes it
