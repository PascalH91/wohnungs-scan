/**
 * Base scraper abstraction to eliminate code duplication across 25+ scrapers
 */
import { Browser, Page } from "puppeteer-core";
import { acquireBrowser, releaseBrowser, destroyBrowser } from "./getBrowser";
import { generateRandomUA } from "./generateRandomUserAgents";
import { containsRelevantCityCode } from "./containsRelevantCityCodes";
import { transformSizeIntoValidNumber } from "./transformSizeIntoValidNumber";
import { config } from "@/config";
import { Offer, ProviderHealth, ScraperResponse } from "@/types";
import { createLogger } from "./logger";
import { titleContainsDisqualifyingPattern } from "./titleContainsDisqualifyingPattern";
import { persistOffers, persistSnapshot } from "./offerStore";

const logger = createLogger("base-scraper");

// Pick one realistic user agent per process. A real browser keeps a stable UA;
// rotating it on every request from a single IP is itself a bot signal.
const SESSION_USER_AGENT = generateRandomUA();

export interface ScraperConfig {
    providerName: string;
    url: string;
    waitForSelector?: string;
    selectorTimeout?: number;
    navigationTimeout?: number;
    /**
     * Set when this provider's extractOffers emits a genuine stable per-listing
     * id in Offer.id (e.g. a data-* attribute or listing URL). The offer store
     * then keys identity on that id instead of a content fingerprint. Leave
     * unset/false for providers that use a constant or content-derived id.
     */
    stableId?: boolean;
    extractOffers: (page: Page) => Promise<{ offers: Offer[]; isMultiPages?: boolean }>;
    /**
     * Optional probes that let assessHealth() tell a genuinely-empty result apart
     * from a silently-broken scraper. All fields are optional — supply whatever
     * the provider's page makes available; the more you give, the more confidently
     * a break can be distinguished from a real "no flats right now".
     */
    health?: {
        /** Selector for an individual listing card. Counted pre-filter, so it's not
         * skewed by our district/title filters — the key signal for "site has
         * results but our selector matched nothing". */
        listingSelector?: string;
        /** Selector for a structural element that exists regardless of whether there
         * are any listings (results container, filter form, "X Treffer" box). Its
         * absence means the page was redesigned or we landed somewhere unexpected. */
        anchorSelector?: string;
        /** Reads the result count the site itself advertises ("66 Ergebnisse"),
         * or null if it can't be found. The strongest signal: advertised > 0 while
         * we parsed 0 is an unambiguous break. */
        resultCount?: (page: Page) => Promise<number | null>;
        /** For "sentinel" providers that don't enumerate listings but show a fixed
         * "no apartments" page (and the scraper pushes a single synthetic offer
         * otherwise). For these, empty is normal — the only failure mode is the
         * anchorSelector disappearing. Set this so they are judged on the anchor
         * alone and never flagged as stale-empty. */
        presenceOnly?: boolean;
        /** Opt into the time-based stale-empty baseline: alert if this provider
         * shows zero listing CARDS (pre-filter) for staleEmptyHours. Only enable
         * for high-volume providers that reliably always have stock — otherwise a
         * genuinely empty page trips it. Requires listingSelector. */
        baselineEmpty?: boolean;
    };
}

export interface ScraperOptions {
    maxRetries?: number;
    retryDelay?: number;
    customUserAgent?: string;
}

/**
 * Setup page context with common functions exposed to page.evaluate()
 */
async function setupPageContext(page: Page, providerName: string): Promise<void> {
    // Expose common functions to page context
    await page.exposeFunction("isInRelevantDistrict", (cityCode: string) => containsRelevantCityCode(cityCode));
    await page.exposeFunction("transformSizeIntoValidNumber", (roomSize: string) =>
        transformSizeIntoValidNumber(roomSize),
    );
    await page.exposeFunction("getMinRoomNumber", () => config.apartment.minRoomNumber);
    await page.exposeFunction("getMinRoomSize", () => config.apartment.minRoomSize);
    await page.exposeFunction("getMaxColdRent", () => config.apartment.maxColdRent);
    await page.exposeFunction("getMaxWarmRent", () => config.apartment.maxWarmRent);
    await page.exposeFunction("titleContainsDisqualifyingPattern", (title: string) =>
        titleContainsDisqualifyingPattern(title),
    );

    // Mirror the target page's own console output. These are messages from the
    // SCRAPED WEBSITE (e.g. a broken WordPress plugin), not from our scraper, so
    // they are logged at debug level only — surfacing them as errors made
    // third-party site bugs look like our failures. Set LOG_LEVEL=DEBUG to see
    // them when diagnosing a specific scraper.
    page.on("console", (msg) => {
        logger.debug(`[${providerName}] remote page console`, { type: msg.type(), message: msg.text() });
    });
}

/**
 * Error that must NOT be retried. Used for block/rate-limit responses, where
 * retrying immediately would only deepen the block and look more bot-like.
 */
class NonRetryableError extends Error {}

/** Thrown when a scrape step blows past its hard time budget. */
class TimeoutError extends Error {}

/**
 * Race a promise against a hard timeout. Used to bound the offer-extraction step,
 * which otherwise has no timeout of its own (paginating scrapers run in-page
 * loops that can hang). On timeout the underlying work keeps running, so the
 * caller MUST tear down the browser to actually stop it and free the pool slot.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new TimeoutError(`${label} exceeded ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}

/**
 * Retry wrapper for async operations
 */
async function withRetry<T>(
    operation: () => Promise<T>,
    options: { maxRetries: number; retryDelay: number; operationName: string },
): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;

            // A block/rate-limit must fail fast — never retry into it.
            if (error instanceof NonRetryableError) {
                logger.warn(`${options.operationName} hit a non-retryable block`, { error: error.message });
                throw error;
            }

            logger.warn(`${options.operationName} failed, attempt ${attempt}/${options.maxRetries}`, {
                error: error.message,
            });

            if (attempt < options.maxRetries) {
                await new Promise((resolve) => setTimeout(resolve, options.retryDelay));
            }
        }
    }

    throw lastError || new Error(`${options.operationName} failed after ${options.maxRetries} attempts`);
}

/**
 * Detect mangled fields among the offers we DID return — the case where the card
 * selector still matches but a sub-selector changed underneath it (e.g. GESOBAU
 * started wrapping each datum in an SVG, so `size` came back full of HTML and
 * `rooms` as NaN). Returns a reason string when too many offers look broken, else
 * null. Only flags clear garbage, never merely-absent fields (a scraper that
 * legitimately doesn't populate rooms/size must not trip this).
 */
function assessFieldHealth(offers: Offer[]): string | null {
    if (offers.length === 0) return null;

    let malformed = 0;
    for (const offer of offers) {
        const sizeStr = offer.size != null ? String(offer.size) : "";
        const roomsStr = offer.rooms != null ? String(offer.rooms) : "";
        // size present but containing HTML, or no digit at all → garbage.
        const sizeBad = sizeStr.length > 0 && (sizeStr.includes("<") || !/\d/.test(sizeStr));
        // rooms parsed to a non-number.
        const roomsBad = roomsStr === "NaN";
        if (sizeBad || roomsBad) malformed += 1;
    }

    const fraction = malformed / offers.length;
    if (fraction >= config.health.malformedFieldThreshold) {
        return `${malformed}/${offers.length} returned offers have malformed fields (HTML in size or non-numeric rooms) — a card sub-selector likely changed`;
    }
    return null;
}

/**
 * Classify the health of a completed scrape so a silent break can be alerted on.
 * Combines several independent signals (advertised count, structural anchor,
 * field sanity, raw card count) precisely because no single one resolves the
 * "empty vs broken" ambiguity on its own.
 */
async function assessHealth(
    page: Page,
    scraperConfig: ScraperConfig,
    offers: Offer[],
): Promise<ProviderHealth> {
    const hc = scraperConfig.health;
    let rawCount = -1;
    let anchorPresent: boolean | null = null;
    let advertisedCount: number | null = null;

    if (hc?.listingSelector) {
        rawCount = await page.evaluate((sel) => document.querySelectorAll(sel).length, hc.listingSelector);
    }
    if (hc?.anchorSelector) {
        anchorPresent = await page.evaluate((sel) => !!document.querySelector(sel), hc.anchorSelector);
    }
    if (hc?.resultCount) {
        try {
            advertisedCount = await hc.resultCount(page);
        } catch (error: any) {
            logger.debug(`resultCount probe failed for ${scraperConfig.providerName}`, { error: error?.message });
        }
    }

    const baselineEligible = Boolean(hc?.baselineEmpty);

    // Sentinel providers (fixed "no apartments" page; a single synthetic offer
    // otherwise) don't enumerate listings, so empty is normal. Their only failure
    // mode is the anchor element vanishing — judge them on that alone.
    if (hc?.presenceOnly) {
        if (anchorPresent === false) {
            return {
                status: "SUSPECT",
                reasons: [`anchor "${hc.anchorSelector}" not found — page may have been redesigned (presence check can no longer run)`],
                rawCount,
                advertisedCount,
                baselineEligible: false,
            };
        }
        return { status: "HEALTHY", reasons: [], rawCount, advertisedCount, baselineEligible: false };
    }

    const reasons: string[] = [];

    // Structural anchor gone → page redesigned or we were redirected somewhere else.
    if (anchorPresent === false) {
        reasons.push(`structural anchor "${hc!.anchorSelector}" not found — page may have been redesigned or moved`);
    }

    // Site advertises results but our card selector matched none → selector broken.
    if (advertisedCount !== null && advertisedCount > 0 && rawCount === 0) {
        reasons.push(
            `site advertises ${advertisedCount} result(s) but the listing selector matched 0 — card markup likely changed`,
        );
    }

    // Cards matched but their fields are garbage → sub-selector broken.
    const fieldIssue = assessFieldHealth(offers);
    if (fieldIssue) reasons.push(fieldIssue);

    if (reasons.length) {
        return { status: "SUSPECT", reasons, rawCount, advertisedCount, baselineEligible };
    }

    // No problems found — now decide between "has results", "confirmed empty", and
    // "empty but can't confirm".
    if (rawCount > 0 || offers.length > 0) {
        return { status: "HEALTHY", reasons: [], rawCount, advertisedCount, baselineEligible };
    }
    if (advertisedCount === 0 || anchorPresent === true) {
        // The page rendered fine (count says 0, or the results scaffold is present)
        // — genuinely no flats right now.
        return { status: "EMPTY_OK", reasons: [], rawCount, advertisedCount, baselineEligible };
    }
    return {
        status: "UNKNOWN",
        reasons: ["0 listings and no corroborating signal — can't tell an empty page from a broken scraper on this run alone"],
        rawCount,
        advertisedCount,
        baselineEligible,
    };
}

/**
 * Execute a scraper with consistent error handling, retry logic, and browser management
 */
export async function executeScraper(
    scraperConfig: ScraperConfig,
    options: ScraperOptions = {},
): Promise<ScraperResponse> {
    const {
        maxRetries = config.scraping.maxRetries,
        retryDelay = config.scraping.retryDelay,
        customUserAgent,
    } = options;

    const { providerName, url, waitForSelector, selectorTimeout, navigationTimeout, stableId, extractOffers } =
        scraperConfig;

    logger.info(`Starting scraper for ${providerName}`, { url });

    let browser: Browser | null = null;
    let page: Page | null = null;
    let succeeded = false;

    try {
        // Acquire browser from pool
        browser = await withRetry(() => acquireBrowser(), {
            maxRetries,
            retryDelay,
            operationName: `Acquire browser for ${providerName}`,
        });

        page = await browser.newPage();

        // Block heavy, non-essential resources (images, media, fonts) to cut
        // bandwidth dramatically — these dominate page weight and are never read
        // when extracting text data. Stylesheets and scripts are kept so that
        // visibility-based `waitForSelector` checks and JS-rendered listings
        // still work. Disable with SCRAPER_BLOCK_RESOURCES=false if a provider
        // needs the full page. Enabled by default.
        if (process.env.SCRAPER_BLOCK_RESOURCES !== "false") {
            const BLOCKED = new Set(["image", "media", "font"]);
            await page.setRequestInterception(true);
            page.on("request", (request) => {
                if (request.isInterceptResolutionHandled()) return;
                if (BLOCKED.has(request.resourceType())) {
                    void request.abort();
                } else {
                    void request.continue();
                }
            });
        }

        // Set user agent (stable per process unless a scraper overrides it).
        const userAgent = customUserAgent || SESSION_USER_AGENT;
        await page.setUserAgent(userAgent);

        // Setup page context with exposed functions
        await setupPageContext(page, providerName);

        // Navigate to URL with retry logic
        const response = await withRetry(
            async () => {
                const resp = await page!.goto(url, {
                    waitUntil: "networkidle2",
                    timeout: navigationTimeout || config.scraping.navigationTimeout,
                });
                const status = resp?.status();
                // Rate-limited / forbidden: do NOT retry — that only deepens the block.
                if (status === 403 || status === 429 || status === 503) {
                    throw new NonRetryableError(`Blocked by ${providerName}: HTTP ${status} ${resp?.statusText()}`);
                }
                if (!resp || status !== 200) {
                    throw new Error(`HTTP ${status} ${resp?.statusText()}`);
                }
                return resp;
            },
            { maxRetries, retryDelay, operationName: `Navigate to ${providerName}` },
        );

        logger.debug(`Successfully navigated to ${providerName}`, { status: response.status() });

        // Wait for selector if specified
        if (waitForSelector) {
            await page.waitForSelector(waitForSelector, {
                visible: true,
                timeout: selectorTimeout || config.scraping.selectorTimeout,
            });
            logger.debug(`Selector found for ${providerName}`, { selector: waitForSelector });
        }

        // Extract offers using provider-specific logic, under a hard time budget.
        // Without this, a hung in-page evaluate (pagination loop, unresponsive
        // page) would never resolve, the finally below would never run, and the
        // browser's pool slot would be held forever — eventually deadlocking the
        // whole pool. On timeout we throw; the finally then DESTROYS the browser.
        const data = await withTimeout(
            extractOffers(page),
            config.scraping.scrapeTimeout,
            `extractOffers(${providerName})`,
        );

        // Assess scrape health (empty vs silently broken) before we tear the page
        // down — the probes read the live DOM. Never let this break the scrape.
        let health: ProviderHealth | undefined;
        try {
            health = await assessHealth(page, scraperConfig, data.offers);
        } catch (error: any) {
            logger.debug(`Health assessment failed for ${providerName}`, { error: error?.message });
        }

        logger.info(`Successfully scraped ${providerName}`, {
            offerCount: data.offers.length,
            isMultiPages: data.isMultiPages,
            health: health?.status,
            ...(health && health.status !== "HEALTHY" ? { healthReasons: health.reasons } : {}),
        });

        // Persist offers to the local store and attach isNew flags from firstSeenAt.
        // Persistence failures must not break the scrape response.
        try {
            data.offers = await persistOffers(providerName, data.offers, { useProviderId: stableId });
        } catch (error: any) {
            logger.error(`Failed to persist offers for ${providerName}`, error);
        }

        // Save the current listing as this provider's snapshot for the frontend.
        try {
            await persistSnapshot(providerName, data.offers, data.isMultiPages ?? false, "", health);
        } catch (error: any) {
            logger.error(`Failed to persist snapshot for ${providerName}`, error);
        }

        succeeded = true;
        return { data, errors: "" };
    } catch (error: any) {
        const errorMessage = error?.message || String(error);
        logger.error(`Scraper failed for ${providerName}`, error, { url });

        // Record the error in the snapshot so the frontend can surface it.
        try {
            await persistSnapshot(providerName, [], false, errorMessage);
        } catch (snapshotError: any) {
            logger.error(`Failed to persist error snapshot for ${providerName}`, snapshotError);
        }

        return {
            data: { offers: [], isMultiPages: false },
            errors: errorMessage,
        };
    } finally {
        if (browser) {
            if (succeeded) {
                // Healthy scrape → close just the page (bounded, so a wedged page
                // can't hang here) and return the browser to the pool for reuse.
                if (page) {
                    await withTimeout(page.close(), 5000, `page.close(${providerName})`).catch((error) =>
                        logger.warn(`Error/timeout closing page for ${providerName}`, { error: error?.message }),
                    );
                }
                releaseBrowser(browser);
                logger.debug(`Released browser for ${providerName}`);
            } else {
                // Errored or timed out → the browser may be wedged (hung evaluate /
                // unresponsive page). Destroy it so its pool slot is freed
                // immediately and a bad browser is never handed to the next caller.
                destroyBrowser(browser);
                logger.debug(`Destroyed browser for ${providerName} after failure`);
            }
        }
    }
}

/**
 * Helper to create a scraper function with consistent signature
 */
export function createScraper(scraperConfig: ScraperConfig, options?: ScraperOptions): () => Promise<ScraperResponse> {
    return () => executeScraper(scraperConfig, options);
}
