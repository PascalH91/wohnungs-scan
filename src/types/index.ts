/**
 * Shared type definitions for the apartment scanning application
 */

/**
 * Apartment offer data structure
 */
export interface Offer {
    id: string;
    address: string;
    title?: string;
    region?: string;
    link?: string | null;
    size?: string;
    rooms?: number | string;
    blocked?: boolean;
    daysUntilAccessible?: number;
    /** Server-side signal: this offer was first seen recently enough to warrant alerting. */
    isNew?: boolean;
}

/**
 * Health of a single scrape, used to tell a genuinely-empty result apart from a
 * silently-broken scraper (changed DOM, moved URL, mangled fields).
 *
 * - HEALTHY:  listings were found (and their fields look sane).
 * - EMPTY_OK: confirmed genuinely empty — the page rendered fine (anchor present
 *             or the site advertised 0 results), there just are no flats.
 * - SUSPECT:  something looks broken — see `reasons`. This is what gets alerted.
 * - UNKNOWN:  0 results with no corroborating signal; can't tell empty from
 *             broken on this run alone (the time-based baseline check decides).
 */
export type HealthStatus = "HEALTHY" | "EMPTY_OK" | "SUSPECT" | "UNKNOWN";

export interface ProviderHealth {
    status: HealthStatus;
    /** Human-readable explanations for a SUSPECT/UNKNOWN verdict. */
    reasons: string[];
    /** Listing elements matched by the provider's card selector, pre-filter. -1 if not probed. */
    rawCount: number;
    /** Result count the site itself advertises ("66 Ergebnisse"), or null if not probed. */
    advertisedCount: number | null;
    /** Whether this provider opted into the time-based stale-empty baseline. Only
     * meaningful for high-volume providers that reliably always have listings;
     * the strict size/room filter makes "empty" normal for everyone else. */
    baselineEligible: boolean;
}

/**
 * Response structure from scraper functions
 */
export interface ScraperResponse {
    data: {
        offers: Offer[];
        isMultiPages?: boolean;
    };
    errors: string;
}

/**
 * Provider type identifiers
 */
export type ProviderType =
    | "WBM"
    | "FRIEDRICHSHEIM"
    | "GEWOBAG"
    | "DEUTSCHE_WOHNEN"
    | "HOWOGE"
    | "DPF"
    | "STADTUNDLAND"
    | "GESOBAU"
    | "DAGEWO"
    | "VONOVIA"
    | "SOLIDARITAET"
    | "WBG_FRIEDRICHSHAIN_EG"
    | "BEROLINA"
    | "NEUES_BERLIN"
    | "PARADIES"
    | "WG_VORWAERTS"
    | "FORUM_KREUZBERG"
    | "EG_1892"
    | "VATERLAND"
    | "VINETA_89"
    | "EBAY_KLEINANZEIGEN"
    | "BERLINOVO"
    | "ADLERGROUP"
    | "EVM"
    | "IMMOSCOUT";

/**
 * Provider configuration details
 */
export interface ProviderDetails {
    id: ProviderType;
    name: string;
    logo?: string;
    url?: string;
}

/**
 * District and postal code mapping
 */
export interface DistrictCode {
    district: string;
    code: string;
}

/**
 * Window extensions for page context evaluation
 * These functions are exposed to the page context in scrapers
 */
declare global {
    interface Window {
        isInRelevantDistrict: (code: string | undefined) => Promise<{ district: string; code: string } | undefined>;
        transformSizeIntoValidNumber: (size: string | undefined) => Promise<number | null>;
        getMinRoomNumber: () => Promise<number>;
        getMinRoomSize: () => Promise<number>;
        getMaxColdRent: () => Promise<number>;
        getMaxWarmRent: () => Promise<number>;
        titleContainsDisqualifyingPattern: (title: string) => Promise<boolean>;
    }
}

export {};
