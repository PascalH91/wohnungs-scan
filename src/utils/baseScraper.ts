/**
 * Base scraper abstraction to eliminate code duplication across 25+ scrapers
 */
import { Browser, Page } from "puppeteer-core";
import { acquireBrowser, releaseBrowser } from "./getBrowser";
import { generateRandomUA } from "./generateRandomUserAgents";
import { containsRelevantCityCode } from "./containsRelevantCityCodes";
import { transformSizeIntoValidNumber } from "./transformSizeIntoValidNumber";
import { config } from "@/config";
import { Offer, ScraperResponse } from "@/types";
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
    extractOffers: (page: Page) => Promise<{ offers: Offer[]; isMultiPages?: boolean }>;
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

    const { providerName, url, waitForSelector, selectorTimeout, navigationTimeout, extractOffers } = scraperConfig;

    logger.info(`Starting scraper for ${providerName}`, { url });

    let browser: Browser | null = null;
    let page: Page | null = null;

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

        // Extract offers using provider-specific logic
        const data = await extractOffers(page);

        logger.info(`Successfully scraped ${providerName}`, {
            offerCount: data.offers.length,
            isMultiPages: data.isMultiPages,
        });

        // Persist offers to the local store and attach isNew flags from firstSeenAt.
        // Persistence failures must not break the scrape response.
        try {
            data.offers = await persistOffers(providerName, data.offers);
        } catch (error: any) {
            logger.error(`Failed to persist offers for ${providerName}`, error);
        }

        // Save the current listing as this provider's snapshot for the frontend.
        try {
            await persistSnapshot(providerName, data.offers, data.isMultiPages ?? false, "");
        } catch (error: any) {
            logger.error(`Failed to persist snapshot for ${providerName}`, error);
        }

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
        // Cleanup: close page and release browser back to pool
        if (page) {
            try {
                await page.close();
            } catch (error) {
                logger.error(`Error closing page for ${providerName}`, error);
            }
        }

        if (browser) {
            releaseBrowser(browser);
            logger.debug(`Released browser for ${providerName}`);
        }
    }
}

/**
 * Helper to create a scraper function with consistent signature
 */
export function createScraper(scraperConfig: ScraperConfig, options?: ScraperOptions): () => Promise<ScraperResponse> {
    return () => executeScraper(scraperConfig, options);
}
