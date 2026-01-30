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

const logger = createLogger("base-scraper");

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
async function setupPageContext(page: Page): Promise<void> {
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

    // Log console messages from page context
    page.on("console", (msg) => {
        const text = msg.text();
        if (text.includes("ERROR") || text.includes("Error")) {
            logger.error("Browser console error", undefined, { message: text });
        } else {
            logger.debug("Browser console", { message: text });
        }
    });
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

        // Set custom user agent
        const userAgent = customUserAgent || generateRandomUA();
        await page.setUserAgent(userAgent);

        // Setup page context with exposed functions
        await setupPageContext(page);

        // Navigate to URL with retry logic
        const response = await withRetry(
            async () => {
                const resp = await page!.goto(url, {
                    waitUntil: "networkidle2",
                    timeout: navigationTimeout || config.scraping.navigationTimeout,
                });
                if (!resp || resp.status() !== 200) {
                    throw new Error(`HTTP ${resp?.status()} ${resp?.statusText()}`);
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

        return { data, errors: "" };
    } catch (error: any) {
        const errorMessage = error?.message || String(error);
        logger.error(`Scraper failed for ${providerName}`, error, { url });

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
