/**
 * Generic core for JSON-API-based scrapers.
 *
 * A growing number of providers expose their listings as a JSON endpoint, which
 * is faster and far less brittle than scraping the rendered page with Puppeteer.
 * They differ only in how listings are fetched and mapped; the surrounding
 * concerns — per-run user agent, persistence, snapshotting, error handling — are
 * identical and mirror the Puppeteer base scraper. This module owns those
 * concerns so each API scraper is just its fetch+map logic.
 */
import { Offer, ScraperResponse } from "@/types";
import { persistOffers, persistSnapshot } from "./offerStore";
import { createLogger } from "./logger";
import { generateRandomUA } from "./generateRandomUserAgents";

const logger = createLogger("api-scraper");

export interface ApiScraperConfig {
    providerName: string;
    /**
     * Whether Offer.id is a genuine stable per-listing id (so the offer store
     * dedups on it rather than a content fingerprint). True for every API
     * scraper so far — they all surface the provider's own listing id.
     */
    useProviderId?: boolean;
    /** Fetch, map and filter the provider's listings. Receives a per-run user agent. */
    fetchOffers: (ctx: { userAgent: string }) => Promise<Offer[]>;
}

/**
 * Fetch a URL expected to return JSON, throwing a descriptive error on block or
 * non-OK status (block statuses are surfaced distinctly so they read clearly in
 * logs/snapshots). Sends a browser-like UA and bypasses Next.js fetch caching.
 */
export async function fetchJson<T>(url: string, userAgent: string): Promise<T> {
    const resp = await fetch(url, {
        headers: { "User-Agent": userAgent, Accept: "application/json" },
        cache: "no-store",
    });

    if (resp.status === 403 || resp.status === 429 || resp.status === 503) {
        throw new Error(`Blocked: HTTP ${resp.status} ${resp.statusText}`);
    }
    if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    }

    return (await resp.json()) as T;
}

/**
 * Build a scraper from fetch+map logic, wrapping it with the shared per-run UA,
 * persistence, snapshotting and error handling so the rest of the pipeline is
 * unaffected. On failure it records an error snapshot and returns an empty,
 * non-throwing response — exactly like the Puppeteer base scraper.
 */
export function createApiScraper(cfg: ApiScraperConfig): () => Promise<ScraperResponse> {
    const { providerName, useProviderId = true, fetchOffers } = cfg;

    return async (): Promise<ScraperResponse> => {
        logger.info(`Starting scraper for ${providerName}`);

        const userAgent = generateRandomUA();

        try {
            const offers = await fetchOffers({ userAgent });

            logger.info(`Successfully scraped ${providerName}`, { matched: offers.length });

            let decorated = offers;
            try {
                decorated = await persistOffers(providerName, offers, { useProviderId });
            } catch (error: any) {
                logger.error(`Failed to persist offers for ${providerName}`, error);
            }

            try {
                await persistSnapshot(providerName, decorated, false, "");
            } catch (error: any) {
                logger.error(`Failed to persist snapshot for ${providerName}`, error);
            }

            return { data: { offers: decorated, isMultiPages: false }, errors: "" };
        } catch (error: any) {
            const errorMessage = error?.message || String(error);
            logger.error(`Scraper failed for ${providerName}`, error);

            try {
                await persistSnapshot(providerName, [], false, errorMessage);
            } catch (snapshotError: any) {
                logger.error(`Failed to persist error snapshot for ${providerName}`, snapshotError);
            }

            return { data: { offers: [], isMultiPages: false }, errors: errorMessage };
        }
    };
}
