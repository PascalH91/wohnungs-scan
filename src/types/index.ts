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
    refreshRateInSeconds?: number;
    additionalBufferInSeconds?: number;
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
