import { Offer } from "@/types";
import { config } from "@/config";
import { containsRelevantCityCode } from "./containsRelevantCityCodes";
import { titleContainsDisqualifyingPattern } from "./titleContainsDisqualifyingPattern";
import { createApiScraper } from "./apiScraper";
import { extractPrice } from "./price";
import { henselUrl } from "./providerUrls";

const { minRoomSize, minRoomNumber } = config.apartment;

// Immobilien Hensel embeds immowelt's "Homepagemodul" widget, which loads its
// listings from immowelt's JSONP endpoints. A headless browser never gets that
// far (the widget calls `api/notvalid` instead), so we call the endpoints
// directly: `home/api/base` first starts a session (cookie), after which
// `list/api/list` returns the rendered list as an HTML fragment.
const API_BASE = "https://homepagemodul.immowelt.de";
// The widget's account id on Hensel's site (from the embed's API calls).
const WIDGET_GUID = "6b96b994ad4a4131b80b9e6ed4cf426e";
const LIST_QUERY =
    "area=&eType=-1&eCat=-1&geoid=-1&livingarea=&price=&rentfactor=&room=&squareprice=&windowarea=&stype=0";

// Safety cap for the widget's pagination (currently a single page of 9).
const MAX_PAGES = 10;

/** Fetch a JSONP endpoint and return the string passed to the callback. */
async function fetchJsonp(url: string, userAgent: string, cookie: string): Promise<{ body: string; cookie: string }> {
    const resp = await fetch(url, {
        headers: { "User-Agent": userAgent, Referer: "https://www.immobilien-hensel-gmbh.net/", Cookie: cookie },
        cache: "no-store",
    });
    if (resp.status === 403 || resp.status === 429 || resp.status === 503) {
        throw new Error(`Blocked: HTTP ${resp.status} ${resp.statusText}`);
    }
    if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);

    const setCookies = resp.headers.getSetCookie().map((c) => c.split(";")[0]);
    const text = await resp.text();
    const payload = text.slice(text.indexOf("(") + 1, text.lastIndexOf(")"));
    return { body: JSON.parse(payload), cookie: [cookie, ...setCookies].filter(Boolean).join("; ") };
}

function decodeHtml(value: string): string {
    return value
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
        .replace(/&([aou])uml;/gi, (_, v: string) => ({ a: "ä", o: "ö", u: "ü", A: "Ä", O: "Ö", U: "Ü" })[v] ?? v)
        .replace(/&szlig;/g, "ß")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Parse the widget's list HTML. Each listing is a `<div class="hm_listbox">`
 * card; figures come as `<strong class="hm_price">value</strong><span>label</span>`
 * pairs. The markup is a fixed immowelt template, so plain patterns suffice.
 */
async function parseCards(html: string): Promise<Offer[]> {
    const cards = html.split('<div class="hm_listbox">').slice(1);
    const offers: Offer[] = [];

    for (const card of cards) {
        const guid = card.match(/ToExpose\(["']([^"']+)["']\)/)?.[1];
        const title = decodeHtml(card.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? "");
        // Only postal code + city are shown ("13127 Berlin"), enough for the district filter.
        const address = decodeHtml(card.match(/hm_listaddress[\s\S]*?<span>([\s\S]*?)<\/span>/)?.[1] ?? "");

        const figures: Record<string, string> = {};
        for (const [, value, label] of Array.from(
            card.matchAll(/<strong class="hm_price">([\s\S]*?)<\/strong>\s*<span>([\s\S]*?)<\/span>/g),
        )) {
            figures[decodeHtml(label).toLowerCase()] = decodeHtml(value);
        }
        const roomsText = Object.entries(figures).find(([label]) => label.startsWith("zimmer"))?.[1];
        const sizeText = Object.entries(figures).find(([label]) => label.startsWith("wohnfläche"))?.[1];
        const rooms = parseFloat((roomsText ?? "").replace(",", ".")) || 0;
        const size = parseFloat((sizeText ?? "").replace(/\./g, "").replace(",", ".")) || 0;

        if (!guid || !address || rooms < minRoomNumber || size < minRoomSize) continue;
        if (titleContainsDisqualifyingPattern(title)) continue;
        const relevantDistrict = await containsRelevantCityCode(address);
        if (!relevantDistrict) continue;

        offers.push({
            id: guid,
            address,
            title,
            region: relevantDistrict.district,
            // The site's hash route opens this exposé directly (verified).
            link: `${henselUrl.split("#")[0]}#/expose${guid}`,
            size: sizeText,
            rooms,
            // "920 € Kaltmiete zzgl. NK"
            price: extractPrice(decodeHtml(card)),
        });
    }

    return offers;
}

/**
 * Scrape Immobilien Hensel via immowelt's widget endpoints. The listing GUID is
 * a stable per-listing id, so the offer store dedups on it directly.
 */
export const getHenselOffers = createApiScraper({
    providerName: "Hensel",
    useProviderId: true,
    fetchOffers: async ({ userAgent }) => {
        const base = await fetchJsonp(
            `${API_BASE}/home/api/base/?callback=basecallback&guid=${WIDGET_GUID}`,
            userAgent,
            "",
        );

        const offers: Offer[] = [];
        let cookie = base.cookie;
        let pageCount = 1;
        for (let page = 1; page <= Math.min(pageCount, MAX_PAGES); page++) {
            const list = await fetchJsonp(
                `${API_BASE}/list/api/list/?callback=listcallback&guid=${WIDGET_GUID}&page=${page}&${LIST_QUERY}`,
                userAgent,
                cookie,
            );
            cookie = list.cookie;

            // Without a valid session the widget answers "Anfrage fehlerhaft"
            // instead of a list — surface that as an error, not as "no flats".
            if (!/hm_pag_state/.test(list.body)) {
                throw new Error(`Unexpected widget response: ${decodeHtml(list.body).slice(0, 120)}`);
            }

            const pages = Array.from(list.body.matchAll(/ToPage\(["'](\d+)["']\)/g)).map((m) => Number(m[1]));
            pageCount = Math.max(1, ...pages);
            offers.push(...(await parseCards(list.body)));
        }

        return offers;
    },
});
