import { Offer } from "@/types";
import { config } from "@/config";
import { containsRelevantCityCode } from "./containsRelevantCityCodes";
import { titleContainsDisqualifyingPattern } from "./titleContainsDisqualifyingPattern";
import { createApiScraper, fetchJson } from "./apiScraper";
import { howogeApiUrl } from "./providerUrls";

const { minRoomSize, minRoomNumber } = config.apartment;

/** Single flat as returned by HOWOGE's immoList endpoint (only the fields we use). */
interface HowogeObject {
    uid: number;
    /** Street address incl. postal code, e.g. "Streitstraße 5, 13587 Berlin". */
    title: string;
    district: string;
    rent: number;
    area: number;
    rooms: number;
    /** "ja" => WBS (subsidized-housing certificate) required. */
    wbs: string;
    /** Marketing headline, e.g. "3-Zimmer-Wohnung ohne WBS". */
    notice: string;
    /** Relative detail-page path. */
    link: string;
}

interface HowogeResponse {
    immocount?: number;
    teasercount?: number;
    // `projectteaser` holds new-building projects (room ranges, future move-in
    // dates) — intentionally ignored, matching the previous scraper.
    immoobjects?: HowogeObject[];
}

async function toOffer(obj: HowogeObject): Promise<Offer | null> {
    // Skip listings that require a WBS certificate.
    if (obj.wbs === "ja") return null;

    const notice = obj.notice?.trim() ?? "";
    if (titleContainsDisqualifyingPattern(notice)) return null;

    if (typeof obj.rooms === "number" && obj.rooms < minRoomNumber) return null;
    if (typeof obj.area === "number" && obj.area < minRoomSize) return null;

    const address = obj.title?.trim() ?? "";

    // District relevance is keyed on the postal code inside the address.
    const relevantDistrict = await containsRelevantCityCode(address);
    if (!relevantDistrict) return null;

    return {
        id: String(obj.uid),
        address,
        title: notice,
        region: relevantDistrict.district || obj.district,
        link: `https://www.howoge.de${obj.link}`,
        size: `${Math.round(obj.area)}m²`,
        rooms: obj.rooms,
    };
}

/**
 * Scrape HOWOGE for available apartments via its JSON list endpoint instead of
 * the rendered page. uid is a stable per-listing id, so the offer store dedups
 * on it directly.
 */
export const getHOWOGEOffers = createApiScraper({
    providerName: "HOWOGE",
    useProviderId: true,
    fetchOffers: async ({ userAgent }) => {
        const json = await fetchJson<HowogeResponse>(howogeApiUrl, userAgent);
        const objects = json.immoobjects ?? [];
        const mapped = await Promise.all(objects.map(toOffer));
        return mapped.filter((offer): offer is Offer => offer !== null);
    },
});
