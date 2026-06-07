# Deploying Wohnungs-Scan to a cheap VPS

This runs the web UI **and** an unattended background scraper that emails you
whenever a new matching apartment appears — no browser tab needed.

## What was added

- **Email notifications** ([src/utils/email.ts](src/utils/email.ts)) — sends one
  digest email per scrape cycle via [Resend](https://resend.com).
- **Server-side scheduler** ([src/utils/scheduler.ts](src/utils/scheduler.ts)) —
  runs every scraper on an interval, started automatically on server boot via
  [src/instrumentation.ts](src/instrumentation.ts).
- **Exactly-once alerts** — the offer store now tracks `notifiedAt`
  ([src/utils/offerStore.ts](src/utils/offerStore.ts)), so you're emailed about
  each listing only once, even across restarts.
- **Bandwidth saver** — images/fonts/media are blocked during scraping
  ([src/utils/baseScraper.ts](src/utils/baseScraper.ts)), cutting page weight
  ~80%.

## Why a small VPS (and what it costs)

The binding constraint is **RAM for headless Chromium, not bandwidth.** With
images blocked, ~24 sites every 5 min uses only a few GB/day — trivial against a
VPS's multi-TB allowance. A €4–6/month box (e.g. Hetzner CX22, 2 vCPU / 4 GB) is
plenty and keeps cost flat and predictable.

## 1. Get a Resend API key

1. Sign up at https://resend.com (free tier ≈ 3k emails/month).
2. Either verify your own domain, or use the shared `onboarding@resend.dev`
   sender for testing.
3. Create an API key.

## 2. Configure environment

Create `.env.production.local` on the server (it is git-ignored):

```env
ENABLE_SCHEDULER=true
SCRAPE_INTERVAL_MS=300000          # every 5 minutes
SCRAPE_CONCURRENCY=3

RESEND_API_KEY=re_xxxxxxxxxxxx
NOTIFY_EMAIL_TO=p.hanke@p6o.de
NOTIFY_EMAIL_FROM=Wohnungs-Scan <onboarding@resend.dev>

# Apartment filter (same as before)
NEXT_PUBLIC_MIN_ROOM_SIZE=80
NEXT_PUBLIC_MIN_ROOM_NUMBER=3
NEXT_PUBLIC_MAX_COLD_RENT=1900
NEXT_PUBLIC_MAX_WARM_RENT=2000
```

## 3. Deploy with Docker (recommended)

On the VPS, with Docker + Docker Compose installed:

```bash
git clone <your-repo> wohnungs-scan && cd wohnungs-scan
# create .env.production.local as above
docker compose up -d --build
docker compose logs -f          # watch the first scrape cycle
```

The UI is on `http://<server-ip>:8080`. Offers persist in `./data` on the host.
Put nginx/Caddy in front for HTTPS if you expose it publicly.

## 4. Alternative: bare Node + systemd (no Docker)

```bash
# Install Chromium + Node 20 on the box, then:
npm ci && npm run build
```

Create `/etc/systemd/system/wohnungs-scan.service`:

```ini
[Unit]
Description=Wohnungs-Scan
After=network.target

[Service]
WorkingDirectory=/opt/wohnungs-scan
EnvironmentFile=/opt/wohnungs-scan/.env.production.local
Environment=PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ExecStart=/usr/bin/npx next start -p 8080
# Next runs the instrumentation hook (which starts the scheduler) on the FIRST
# request, not at boot — so warm it up once after start.
ExecStartPost=/bin/sh -c 'sleep 8; curl -fsS http://127.0.0.1:8080/ > /dev/null'
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now wohnungs-scan
journalctl -u wohnungs-scan -f
```

## Notes

- **Scheduler startup**: Next runs the instrumentation hook (which starts the
  scheduler) on the first HTTP request, not at boot. The Docker `HEALTHCHECK`
  warms this up automatically; the systemd unit uses an `ExecStartPost` curl.
- **First boot is silent**: existing offers are marked notified on startup, so
  you only get emailed about listings that appear *after* deployment.
- **No email config?** The scraper still runs and tracks offers; it just logs a
  warning instead of sending. Good for a dry run.
- **Tuning load**: raise `SCRAPE_INTERVAL_MS` to scrape less often, or lower
  `SCRAPE_CONCURRENCY` if Chromium pressures RAM.
- The `npm start` script opens a browser and uses `--inspect`, which is for
  local dev. Docker/systemd call `next start` directly to avoid both.
