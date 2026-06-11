# Wohnungs-Scan — Next.js UI + background scrape/email scheduler.
# Uses the system-installed Chromium (no bundled download) to keep the image
# small and stable on a small VPS.
#
# node 22: puppeteer-core@25 declares engines.node ">=22.12.0", so node 20 is
# unsupported (and risks runtime breakage in the scrapers).
FROM node:22-slim

# Chromium + the fonts/libs headless Chrome needs to render real pages.
RUN apt-get update && apt-get install -y --no-install-recommends \
        chromium \
        fonts-liberation \
        fonts-noto-color-emoji \
        ca-certificates \
        curl \
        dumb-init \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

WORKDIR /app

# Install deps first for better layer caching. --include=dev is required even
# though NODE_ENV=production: `next build` needs TypeScript and @types/* (which
# live in devDependencies) to type-check. Without them, Next tries to auto-install
# them at build time via yarn, which then fails on puppeteer's node-engine check.
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Build the Next.js app.
COPY . .
RUN npm run build

# Offers are persisted here — mount a volume so they survive container restarts.
VOLUME ["/app/data"]

EXPOSE 8080

# The healthcheck doubles as the warmup that triggers Next's instrumentation
# hook (register runs on the first request), kicking off the scheduler on a
# fresh, trafficless server. start-period gives the build/boot time to settle.
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8080/ > /dev/null || exit 1

# dumb-init reaps zombie Chromium processes that puppeteer can leave behind.
ENTRYPOINT ["dumb-init", "--"]
CMD ["npx", "next", "start", "-p", "8080"]
