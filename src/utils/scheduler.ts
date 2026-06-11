/**
 * Server-side scrape scheduler.
 *
 * This is what turns the project from a "scrape while the browser tab is open"
 * tool into an unattended background service. On startup it triggers every
 * scraper on a fixed interval, then emails a single digest of any newly
 * discovered offers.
 *
 * It is started once per process from src/instrumentation.ts (Next.js
 * instrumentation hook), so `npm start` boots the web UI and this loop together.
 *
 * Design note — this module talks to everything over HTTP and imports nothing
 * but the dependency-free logger. That is deliberate: it runs inside the Next
 * instrumentation bundle, which cannot resolve puppeteer-core, node builtins
 * (fs/path), or Resend's optional deps. So scraping goes through /api/cron/*
 * and the claim+email step goes through /api/notify — both route handlers,
 * bundled in the server runtime where those imports resolve. This reuses the
 * exact same scrape + persist path the UI already uses.
 *
 * Resource note: routes are triggered with a small concurrency cap rather than
 * all at once, because each one drives a headless Chromium page and RAM — not
 * bandwidth — is the binding constraint on a small VPS.
 */
import { createLogger } from "./logger";

const logger = createLogger("scheduler");

// Route slugs under /api/cron. Mirrors the providers wired up in the UI;
// disabled providers (WBM/IMMOSCOUT) are omitted — add their slug to re-enable.
const SCRAPER_ROUTES: string[] = [
    "wbm",
    "friedrichsheim",
    "gewobag",
    "deutschewohnen",
    "howoge",
    "dpf",
    "stadtundland",
    "gesobau",
    "dagewo",
    "vonovia",
    "solidaritaet",
    "friedrichshain_eg",
    "berolina",
    "neues_berlin",
    "paradies",
    "wg_vorwaerts",
    "forum_kreuzberg",
    "1892",
    "vaterland",
    "vineta_89",
    "ebay_kleinanzeigen",
    "berlinovo",
    "adlergroup",
    "evm",
];

const PORT = process.env.PORT || "8080";
const BASE_URL = process.env.SCHEDULER_BASE_URL || `http://127.0.0.1:${PORT}`;

// Politeness / anti-block knobs. The goal is to look like an occasional human,
// not a scraper: a long, jittered wait between full passes, and a randomized
// gap between individual provider requests so we never fire a burst. Providers
// are also visited in a shuffled order each pass so the pattern isn't identical.
const SCRAPE_INTERVAL_MS = parseInt(process.env.SCRAPE_INTERVAL_MS || `${10 * 60 * 1000}`, 10); // 10 min between passes
const SCRAPE_INTERVAL_JITTER_MS = parseInt(process.env.SCRAPE_INTERVAL_JITTER_MS || `${3 * 60 * 1000}`, 10); // +0..3 min
const PROVIDER_GAP_MS = parseInt(process.env.PROVIDER_GAP_MS || "5000", 10); // min wait between providers
const PROVIDER_GAP_JITTER_MS = parseInt(process.env.PROVIDER_GAP_JITTER_MS || "10000", 10); // +0..10s
// Once a provider blocks/rate-limits us, stop hitting it entirely for this long.
const BLOCK_COOLDOWN_MS = parseInt(process.env.BLOCK_COOLDOWN_MS || `${60 * 60 * 1000}`, 10); // 1 hour

// Hardcoded per-provider minimum gap between scrapes, enforced REGARDLESS of
// SCRAPE_INTERVAL_MS. Protects sensitive providers (WBM has blocked us for
// hitting it too often) even when the global interval is set short for testing.
// A provider is skipped in a pass if it was scraped more recently than this.
const MIN_PROVIDER_INTERVAL_MS: Record<string, number> = {
    wbm: 3 * 60 * 1000, // WBM: at most once every 3 minutes
};
// Added on top of the minimum so the gap isn't exactly on the dot.
const MIN_INTERVAL_JITTER_MS = 30_000; // +0..30s

// Quiet hours: don't scrape overnight (providers don't post new flats then, so
// it's wasted bandwidth + needless block exposure). Evaluated in QUIET_TZ, not
// the server's clock — the container usually runs on UTC. Set START === END to
// disable. Default: pause from 23:00 to 08:00 Berlin time.
const QUIET_HOURS_START = parseInt(process.env.QUIET_HOURS_START || "23", 10);
const QUIET_HOURS_END = parseInt(process.env.QUIET_HOURS_END || "8", 10);
const QUIET_TZ = process.env.QUIET_HOURS_TZ || "Europe/Berlin";

/** Current wall-clock time in QUIET_TZ (handles UTC server + DST correctly). */
function localTimeInQuietTz(): { hour: number; minute: number; second: number } {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: QUIET_TZ,
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).formatToParts(new Date());
    const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || "0", 10);
    // "24" can appear at exactly midnight in some environments → normalise to 0.
    return { hour: get("hour") % 24, minute: get("minute"), second: get("second") };
}

/** True if we're currently inside the quiet window (handles wrap past midnight). */
function isQuietNow(): boolean {
    if (QUIET_HOURS_START === QUIET_HOURS_END) return false; // disabled
    const { hour } = localTimeInQuietTz();
    return QUIET_HOURS_START < QUIET_HOURS_END
        ? hour >= QUIET_HOURS_START && hour < QUIET_HOURS_END // same-day window
        : hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END; // window wraps midnight (e.g. 23→8)
}

/** Milliseconds from now until the quiet window ends (next QUIET_HOURS_END o'clock). */
function msUntilQuietEnds(): number {
    const { hour, minute, second } = localTimeInQuietTz();
    const hoursUntil = (QUIET_HOURS_END - hour + 24) % 24;
    let ms = ((hoursUntil * 60 - minute) * 60 - second) * 1000;
    if (ms <= 0) ms += 24 * 60 * 60 * 1000;
    return ms;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const randomGap = () => PROVIDER_GAP_MS + Math.floor(Math.random() * PROVIDER_GAP_JITTER_MS);

/** Fisher–Yates shuffle (returns a new array). */
function shuffled<T>(arr: T[]): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

let running = false;
let cycleTimer: NodeJS.Timeout | null = null;
let started = false;
// slug -> epoch ms until which we skip the provider after it blocked us.
const cooldownUntil: Record<string, number> = {};
// slug -> epoch ms of last actual scrape, for enforcing MIN_PROVIDER_INTERVAL_MS.
const lastScrapedAt: Record<string, number> = {};

/** Trigger one provider's scrape. Returns whether it blocked us and the detail. */
async function triggerRoute(slug: string): Promise<{ blocked: boolean; detail: string }> {
    try {
        const res = await fetch(`${BASE_URL}/api/cron/${slug}`, { cache: "no-store" });
        if (!res.ok) {
            logger.warn(`Scraper route returned non-OK status: ${slug}`, { status: res.status });
            const blocked = res.status === 403 || res.status === 429;
            return { blocked, detail: blocked ? `HTTP ${res.status}` : "" };
        }
        const body = (await res.json()) as { errors?: string };
        if (body?.errors) {
            logger.warn(`Scraper reported error: ${slug}`, { error: body.errors });
            // Heuristic: treat rate-limit / forbidden / explicit "blocked" as a block.
            const blocked = /\b(403|429)\b|blocked|rate.?limit|too many requests/i.test(body.errors);
            return { blocked, detail: blocked ? body.errors : "" };
        }
        return { blocked: false, detail: "" };
    } catch (error) {
        logger.error(`Failed to trigger scraper: ${slug}`, error);
        return { blocked: false, detail: "" };
    }
}

/**
 * One full pass: visit every provider once, sequentially, in shuffled order,
 * with a randomized gap between each (no bursts), skipping any provider that is
 * in a block cooldown. Then email a digest of new offers.
 */
async function runCycle(): Promise<void> {
    if (isQuietNow()) {
        logger.info("Skipping scrape cycle — quiet hours", { tz: QUIET_TZ });
        return;
    }
    if (running) {
        logger.warn("Previous scrape cycle still running — skipping");
        return;
    }
    running = true;
    const startedAt = Date.now();
    const order = shuffled(SCRAPER_ROUTES);
    logger.info("Starting scrape cycle", { scrapers: order.length });

    const blockedThisCycle: { provider: string; detail: string }[] = [];

    try {
        for (let i = 0; i < order.length; i++) {
            const slug = order[i];

            const cooldown = cooldownUntil[slug];
            if (cooldown && Date.now() < cooldown) {
                logger.info(`Skipping ${slug} — in block cooldown`, {
                    until: new Date(cooldown).toISOString(),
                });
                continue;
            }

            // Enforce the hardcoded per-provider minimum gap (e.g. WBM ≥ 3 min),
            // regardless of the global interval.
            const minGap = MIN_PROVIDER_INTERVAL_MS[slug];
            if (minGap) {
                const last = lastScrapedAt[slug];
                const effectiveGap = minGap + Math.floor(Math.random() * MIN_INTERVAL_JITTER_MS);
                if (last && Date.now() - last < effectiveGap) {
                    logger.info(`Skipping ${slug} — minimum interval not elapsed`, {
                        minIntervalMs: minGap,
                        sinceLastMs: Date.now() - last,
                    });
                    continue;
                }
            }

            const { blocked, detail } = await triggerRoute(slug);
            lastScrapedAt[slug] = Date.now();
            if (blocked) {
                cooldownUntil[slug] = Date.now() + BLOCK_COOLDOWN_MS;
                blockedThisCycle.push({ provider: slug, detail });
                logger.warn(`${slug} appears to be blocking us — backing off`, {
                    cooldownUntil: new Date(cooldownUntil[slug]).toISOString(),
                });
            }

            // Polite randomized gap before the next provider (not after the last).
            if (i < order.length - 1) await sleep(randomGap());
        }

        // Alert by email if any provider blocked us this pass (one digest).
        if (blockedThisCycle.length) {
            try {
                await fetch(`${BASE_URL}/api/notify-block`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    cache: "no-store",
                    body: JSON.stringify({ blocked: blockedThisCycle }),
                });
            } catch (error) {
                logger.error("Block-alert step failed", error);
            }
        }

        // The notify route atomically claims unnotified offers and emails one
        // digest. Each new offer is emailed exactly once, even across restarts
        // (notifiedAt persists in the store).
        let newOffers = 0;
        try {
            const res = await fetch(`${BASE_URL}/api/notify`, { cache: "no-store" });
            const body = (await res.json()) as { newOffers?: number };
            newOffers = body?.newOffers ?? 0;
        } catch (error) {
            logger.error("Notify step failed", error);
        }

        // Health digest: alert on providers that look broken rather than empty
        // (changed DOM / moved URL / mangled fields, or stale-empty baselines).
        try {
            const res = await fetch(`${BASE_URL}/api/notify-health`, { cache: "no-store" });
            const body = (await res.json()) as { issues?: number; providers?: string[] };
            if (body?.issues) {
                logger.warn("Scrape-health issues detected", { count: body.issues, providers: body.providers });
            }
        } catch (error) {
            logger.error("Health-check step failed", error);
        }

        logger.info("Scrape cycle complete", { durationMs: Date.now() - startedAt, newOffers });
    } finally {
        running = false;
    }
}

/** Start the scheduler. Idempotent — safe to call more than once per process. */
export async function startScheduler(): Promise<void> {
    if (started) return;
    started = true;

    logger.info("Initializing scheduler", {
        baseUrl: BASE_URL,
        intervalMs: SCRAPE_INTERVAL_MS,
        intervalJitterMs: SCRAPE_INTERVAL_JITTER_MS,
        providerGapMs: PROVIDER_GAP_MS,
    });

    // Run the first pass shortly after the HTTP server is up, then schedule the
    // rest. On a fresh/empty store this emails the current matches; on a server
    // restart, persisted notifiedAt flags keep already-seen offers quiet so only
    // genuinely-new listings are emailed.
    setTimeout(async () => {
        await runCycle();
        scheduleNextCycle();
    }, 10000);
}

/**
 * Schedule the next pass with a randomized delay AFTER the previous one
 * finishes — so passes never overlap and the cadence isn't perfectly regular.
 * During quiet hours it sleeps in one go until the window ends, instead of
 * waking every interval to do nothing.
 */
function scheduleNextCycle(): void {
    let delay: number;
    if (isQuietNow()) {
        // Sleep until the quiet window ends (+ a little jitter), then resume.
        delay = msUntilQuietEnds() + Math.floor(Math.random() * SCRAPE_INTERVAL_JITTER_MS);
        logger.info("Quiet hours — pausing until window ends", {
            tz: QUIET_TZ,
            resumeInMinutes: Math.round(delay / 60000),
        });
    } else {
        delay = SCRAPE_INTERVAL_MS + Math.floor(Math.random() * SCRAPE_INTERVAL_JITTER_MS);
        logger.info("Next scrape cycle scheduled", { inMinutes: Math.round(delay / 60000) });
    }
    cycleTimer = setTimeout(async () => {
        await runCycle();
        scheduleNextCycle();
    }, delay);
}

export function stopScheduler(): void {
    if (cycleTimer) clearTimeout(cycleTimer);
    cycleTimer = null;
    started = false;
}
