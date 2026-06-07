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
const SCRAPE_INTERVAL_MS = parseInt(process.env.SCRAPE_INTERVAL_MS || `${5 * 60 * 1000}`, 10);
const SCRAPE_CONCURRENCY = parseInt(process.env.SCRAPE_CONCURRENCY || "3", 10);

let running = false;
let timer: NodeJS.Timeout | null = null;
let started = false;

/** Run an array of tasks with a fixed concurrency limit. */
async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<void> {
    let index = 0;
    const workers = Array.from({ length: Math.max(1, limit) }, async () => {
        while (index < tasks.length) {
            const current = index++;
            try {
                await tasks[current]();
            } catch (error) {
                logger.error("Scraper task threw", error);
            }
        }
    });
    await Promise.all(workers);
}

async function triggerRoute(slug: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/cron/${slug}`, { cache: "no-store" });
    if (!res.ok) {
        logger.warn(`Scraper route returned non-OK status: ${slug}`, { status: res.status });
        return;
    }
    const body = (await res.json()) as { errors?: string };
    if (body?.errors) logger.warn(`Scraper reported error: ${slug}`, { error: body.errors });
}

/** Trigger every scraper once, then email a digest of any new offers. */
async function runCycle(): Promise<void> {
    if (running) {
        logger.warn("Previous scrape cycle still running — skipping this tick");
        return;
    }
    running = true;
    const startedAt = Date.now();
    logger.info("Starting scrape cycle", { scrapers: SCRAPER_ROUTES.length, concurrency: SCRAPE_CONCURRENCY });

    try {
        await runWithConcurrency(
            SCRAPER_ROUTES.map((slug) => () => triggerRoute(slug)),
            SCRAPE_CONCURRENCY,
        );

        // The notify route atomically claims unnotified offers and emails one
        // digest. Each new offer is emailed exactly once, even across restarts.
        let newOffers = 0;
        try {
            const res = await fetch(`${BASE_URL}/api/notify`, { cache: "no-store" });
            const body = (await res.json()) as { newOffers?: number };
            newOffers = body?.newOffers ?? 0;
        } catch (error) {
            logger.error("Notify step failed", error);
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
        concurrency: SCRAPE_CONCURRENCY,
    });

    // Backfill so the first cycle does not email the entire existing backlog.
    // Runs after the HTTP server is up; the first scrape cycle follows it.
    setTimeout(async () => {
        try {
            const res = await fetch(`${BASE_URL}/api/notify?backfill=1`, { cache: "no-store" });
            const body = (await res.json()) as { backfilled?: number };
            logger.info("Startup backfill complete", { marked: body?.backfilled ?? 0 });
        } catch (error) {
            logger.error("Failed to backfill on startup", error);
        }
        void runCycle();
    }, 10000);

    // Then on a fixed interval.
    timer = setInterval(() => {
        void runCycle();
    }, SCRAPE_INTERVAL_MS);
}

export function stopScheduler(): void {
    if (timer) clearInterval(timer);
    timer = null;
    started = false;
}
