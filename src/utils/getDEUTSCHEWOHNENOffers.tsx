import { Offer, ScraperResponse } from "@/types";
import { config } from "@/config";
import { containsRelevantCityCode } from "./containsRelevantCityCodes";
import { titleContainsDisqualifyingPattern } from "./titleContainsDisqualifyingPattern";
import { persistOffers, persistSnapshot } from "./offerStore";
import { createLogger } from "./logger";
import { generateRandomUA } from "./generateRandomUserAgents";
import { deutscheWohnenApiUrl } from "./providerUrls";

const PROVIDER_NAME = "Deutsche Wohnen";
const logger = createLogger("deutsche-wohnen");

const { minRoomSize } = config.apartment;

// Page size for the deuwo list endpoint. We loop with increasing offsets until
// the reported total is covered, capped by MAX_PAGES as a safety net.
const PAGE_LIMIT = 50;
const MAX_PAGES = 10;

/** Single listing as returned by the deuwo list endpoint (only the fields we use). */
interface DeuwoResult {
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

/**
 * Fetch a single page of the deuwo list endpoint.
 */
async function fetchPage(offset: number, userAgent: string): Promise<DeuwoResponse> {
    const url = `${deutscheWohnenApiUrl}&limit=${PAGE_LIMIT}&offset=${offset}`;
    const resp = await fetch(url, {
        headers: {
            "User-Agent": userAgent,
            Accept: "application/json",
        },
        // Always hit the live endpoint; Next.js otherwise caches fetch responses.
        cache: "no-store",
    });

    if (resp.status === 403 || resp.status === 429 || resp.status === 503) {
        throw new Error(`Blocked by ${PROVIDER_NAME}: HTTP ${resp.status} ${resp.statusText}`);
    }
    if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    }

    return (await resp.json()) as DeuwoResponse;
}

/**
 * Map a raw deuwo result to an Offer, or null if it does not qualify.
 */
async function toOffer(result: DeuwoResult): Promise<Offer | null> {
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
        link: `https://www.deutsche-wohnen.com/mieten/mietangebote/${result.slug}`,
        size: `${Math.round(result.groesse)}m²`,
        rooms: result.anzahl_zimmer,
    };
}

/**
 * Scrape Deutsche Wohnen for available apartments via its JSON list endpoint.
 *
 * This replaces the previous Puppeteer-based scrape: the deuwo endpoint returns
 * structured listing data directly, which is faster, more reliable, and far
 * less brittle than parsing the rendered page. Persistence and snapshotting
 * mirror the base scraper so the rest of the pipeline is unaffected.
 */
export async function getDEUTSCHEWOHNENOffers(): Promise<ScraperResponse> {
    logger.info(`Starting scraper for ${PROVIDER_NAME}`, { url: deutscheWohnenApiUrl });

    const userAgent = generateRandomUA();

    try {
        const raw: DeuwoResult[] = [];
        let offset = 0;
        let total = Infinity;

        for (let page = 0; page < MAX_PAGES && offset < total; page++) {
            const json = await fetchPage(offset, userAgent);
            const results = json.results ?? [];
            total = json.paging?.info?.count ?? results.length;

            raw.push(...results);

            if (results.length < PAGE_LIMIT) break;
            offset += PAGE_LIMIT;
        }

        const mapped = await Promise.all(raw.map(toOffer));
        const offers = mapped.filter((offer): offer is Offer => offer !== null);

        logger.info(`Successfully scraped ${PROVIDER_NAME}`, { fetched: raw.length, matched: offers.length });

        // wrk_id is a genuine stable per-listing id, so dedup on it directly.
        let decorated = offers;
        try {
            decorated = await persistOffers(PROVIDER_NAME, offers, { useProviderId: true });
        } catch (error: any) {
            logger.error(`Failed to persist offers for ${PROVIDER_NAME}`, error);
        }

        try {
            await persistSnapshot(PROVIDER_NAME, decorated, false, "");
        } catch (error: any) {
            logger.error(`Failed to persist snapshot for ${PROVIDER_NAME}`, error);
        }

        return { data: { offers: decorated, isMultiPages: false }, errors: "" };
    } catch (error: any) {
        const errorMessage = error?.message || String(error);
        logger.error(`Scraper failed for ${PROVIDER_NAME}`, error, { url: deutscheWohnenApiUrl });

        try {
            await persistSnapshot(PROVIDER_NAME, [], false, errorMessage);
        } catch (snapshotError: any) {
            logger.error(`Failed to persist error snapshot for ${PROVIDER_NAME}`, snapshotError);
        }

        return { data: { offers: [], isMultiPages: false }, errors: errorMessage };
    }
}
