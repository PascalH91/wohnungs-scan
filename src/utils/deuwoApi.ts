/**
 * Shared client for the Vonovia-family JSON list endpoints.
 *
 * Vonovia, Deutsche Wohnen and the other Vonovia-group brands all expose the
 * same `/api/.../real-estate/list` endpoint with an identical response shape
 * (the "deuwo" data model, served from cdn.expose.vonovia.de). Hitting these
 * directly is faster and far less brittle than scraping the rendered page, so
 * every brand in the family shares this one fetch/paginate/map/persist path.
 *
 * Per-brand differences (endpoint, price filter, detail-page base) are baked
 * into each brand's API URL and DeuwoApiScraperConfig; the logic here is brand
 * agnostic.
 */
import { Offer, ScraperResponse } from "@/types";
import { config } from "@/config";
import { containsRelevantCityCode } from "./containsRelevantCityCodes";
import { titleContainsDisqualifyingPattern } from "./titleContainsDisqualifyingPattern";
import { persistOffers, persistSnapshot } from "./offerStore";
import { createLogger } from "./logger";
import { generateRandomUA } from "./generateRandomUserAgents";

const logger = createLogger("deuwo-api");

const { minRoomSize } = config.apartment;

// Page size for the list endpoint. We loop with increasing offsets until the
// reported total is covered, capped by MAX_PAGES as a safety net.
const PAGE_LIMIT = 50;
const MAX_PAGES = 10;

/** Single listing as returned by the list endpoint (only the fields we use). */
export interface DeuwoResult {
    wrk_id: string;
    titel: string;
    strasse: string;
    plz: string;
    ort: string;
    preis: number;
    groesse: number;
    anzahl_zimmer: number;
    slug: string;
    vermarktungsart_miete: string;
}

interface DeuwoResponse {
    paging?: { info?: { count?: number; limit?: number } };
    results?: DeuwoResult[];
}

export interface DeuwoApiScraperConfig {
    providerName: string;
    /** List endpoint base URL, already carrying the brand's filters. `limit`/`offset` are appended here. */
    apiUrl: string;
    /** Detail-page base; the listing slug is appended (e.g. ".../immobilien" -> ".../immobilien/{slug}"). */
    detailBaseUrl: string;
}

async function fetchPage(apiUrl: string, offset: number, userAgent: string): Promise<DeuwoResponse> {
    const url = `${apiUrl}&limit=${PAGE_LIMIT}&offset=${offset}`;
    const resp = await fetch(url, {
        headers: { "User-Agent": userAgent, Accept: "application/json" },
        // Always hit the live endpoint; Next.js otherwise caches fetch responses.
        cache: "no-store",
    });

    if (resp.status === 403 || resp.status === 429 || resp.status === 503) {
        throw new Error(`Blocked: HTTP ${resp.status} ${resp.statusText}`);
    }
    if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    }

    return (await resp.json()) as DeuwoResponse;
}

/**
 * Map a raw result to an Offer, or null if it does not qualify. Price is not
 * re-checked here — the endpoint's own priceMax filter (baked into apiUrl)
 * already constrains it per brand (cold vs. warm rent).
 */
async function toOffer(result: DeuwoResult, detailBaseUrl: string): Promise<Offer | null> {
    // Only rentals.
    if (result.vermarktungsart_miete !== "1") return null;

    const title = result.titel?.trim() ?? "";
    if (titleContainsDisqualifyingPattern(title)) return null;

    // The endpoint already filters by size, but guard against rounding/edge cases.
    if (typeof result.groesse === "number" && result.groesse < minRoomSize) return null;

    const address = [result.strasse, `${result.plz} ${result.ort}`.trim()].filter(Boolean).join(", ");

    // District relevance is keyed on the postal code (see containsRelevantCityCode).
    const relevantDistrict = await containsRelevantCityCode(result.plz);
    if (!relevantDistrict) return null;

    return {
        id: result.wrk_id,
        address,
        title,
        region: relevantDistrict.district,
        link: `${detailBaseUrl}/${result.slug}`,
        size: `${Math.round(result.groesse)}m²`,
        rooms: result.anzahl_zimmer,
    };
}

/**
 * Build a scraper for a Vonovia-family brand that fetches its JSON list
 * endpoint, paginates, filters, and persists — mirroring the base (Puppeteer)
 * scraper's persistence and error handling so the rest of the pipeline is
 * unaffected. wrk_id is a stable per-listing id, so dedup keys on it directly.
 */
export function createDeuwoApiScraper(cfg: DeuwoApiScraperConfig): () => Promise<ScraperResponse> {
    const { providerName, apiUrl, detailBaseUrl } = cfg;

    return async (): Promise<ScraperResponse> => {
        logger.info(`Starting scraper for ${providerName}`, { url: apiUrl });

        const userAgent = generateRandomUA();

        try {
            const raw: DeuwoResult[] = [];
            let offset = 0;
            let total = Infinity;

            for (let page = 0; page < MAX_PAGES && offset < total; page++) {
                const json = await fetchPage(apiUrl, offset, userAgent);
                const results = json.results ?? [];
                total = json.paging?.info?.count ?? results.length;

                raw.push(...results);

                if (results.length < PAGE_LIMIT) break;
                offset += PAGE_LIMIT;
            }

            const mapped = await Promise.all(raw.map((r) => toOffer(r, detailBaseUrl)));
            const offers = mapped.filter((offer): offer is Offer => offer !== null);

            logger.info(`Successfully scraped ${providerName}`, { fetched: raw.length, matched: offers.length });

            let decorated = offers;
            try {
                decorated = await persistOffers(providerName, offers, { useProviderId: true });
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
            logger.error(`Scraper failed for ${providerName}`, error, { url: apiUrl });

            try {
                await persistSnapshot(providerName, [], false, errorMessage);
            } catch (snapshotError: any) {
                logger.error(`Failed to persist error snapshot for ${providerName}`, snapshotError);
            }

            return { data: { offers: [], isMultiPages: false }, errors: errorMessage };
        }
    };
}
