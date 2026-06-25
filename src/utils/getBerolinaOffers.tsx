import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { berolinaUrl } from "./providerUrls";

const { minRoomSize, minRoomNumber, maxWarmRent } = config.apartment;

// Base of the immosolve single-page app. The detail route is hash-based and
// routes on the numeric listing id alone — the trailing title slug is cosmetic
// (verified: ".../#!/detail-expose-2-301703-x" loads the right expose).
const BEROLINA_BASE = "https://2106276.hpm.immosolve.eu";

// Berolina's listings live in an immosolve AngularJS-Material SPA (loaded via a
// hash route) that renders its result list client-side. Each flat is an
// <md-card> with a stable numeric id; an empty list shows "Keine Ergebnisse".
// We now parse the real cards and apply the same district/size/rooms/rent
// filters as every other provider.
async function extractBerolinaOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    // SPA: wait until the result heading has rendered. It reads "1 Ergebnis",
    // "Keine Ergebnisse", etc. — the word "ergebnis" appears in both the
    // populated and empty states, so this never reads a half-loaded page.
    // `loaded` stays false on timeout, in which case we stay silent.
    const loaded = await page
        .waitForFunction(() => /ergebnis/i.test(document.querySelector("h1")?.textContent || ""), { timeout: 15000 })
        .then(() => true)
        .catch(() => false);

    const offers = await page.evaluate(
        async (didLoad, base) => {
            // Couldn't confirm the list rendered — stay silent rather than risk a
            // false "new offer".
            if (!didLoad) return [] as Offer[];

            const minRoomNumber = await window.getMinRoomNumber();
            const minRoomSize = await window.getMinRoomSize();
            const maxWarmRent = await window.getMaxWarmRent();

            const cards = Array.from(document.querySelectorAll("md-card"));
            const results: Offer[] = [];

            for (const card of cards) {
                const title = (card.querySelector("h2.md-headline") as HTMLElement | null)?.innerText?.trim();
                const address = (card.querySelector(".card_subheader.md-subhead") as HTMLElement | null)?.innerText?.trim();

                // The content paragraph holds the figures as separate spans, e.g.
                // "849,77 €", "• 4,00 Zimmer", "• 72,52 m²". Classify each span by
                // its unit rather than relying on a fixed order.
                const spans = Array.from(card.querySelectorAll("md-card-content p span")) as HTMLElement[];
                let warmRentText = "";
                let roomsText = "";
                let sizeText = "";
                for (const span of spans) {
                    const t = span.innerText;
                    if (/€/.test(t)) warmRentText = t;
                    else if (/zimmer/i.test(t)) roomsText = t;
                    else if (/m²/i.test(t)) sizeText = t;
                }

                // Stable per-listing id from the scroll anchor (id="id_301703").
                const anchorId = card.querySelector(".md_card_scroll_anchor")?.id || "";
                const id = anchorId.replace(/^id_/, "");

                if (!address || !id) continue;

                const relevantDistrict = await window.isInRelevantDistrict(address);
                const transformedRooms = (await window.transformSizeIntoValidNumber(roomsText)) ?? 0;
                const transformedSize = (await window.transformSizeIntoValidNumber(sizeText)) ?? 0;
                // No warm-rent figure shown → treat as 0 so a missing price never
                // filters a flat out on the rent ceiling.
                const transformedWarmRent = (await window.transformSizeIntoValidNumber(warmRentText)) ?? 0;
                const disqualifying = title ? await window.titleContainsDisqualifyingPattern(title) : false;

                const showItem =
                    relevantDistrict &&
                    transformedRooms >= minRoomNumber &&
                    transformedSize >= minRoomSize &&
                    transformedWarmRent <= maxWarmRent &&
                    !disqualifying;

                if (showItem) {
                    results.push({
                        address,
                        id,
                        title,
                        region: relevantDistrict.district,
                        link: `${base}/#!/detail-expose-2-${id}-x`,
                        size: sizeText,
                        rooms: roomsText,
                    });
                }
            }

            return results;
        },
        loaded,
        BEROLINA_BASE,
    );

    return { offers, isMultiPages: false };
}

export const getBerolinaOffers = createScraper({
    providerName: "Berolina",
    url: berolinaUrl,
    // Each <md-card> carries a stable numeric id (the detail-route id), so the
    // offer store can key identity on it instead of a content fingerprint.
    stableId: true,
    extractOffers: extractBerolinaOffers,
    health: {
        // One card per listing.
        listingSelector: "md-card",
        // The result-list header's "back" link exists whether or not there are
        // listings — its absence means the SPA was redesigned or we landed
        // somewhere unexpected.
        anchorSelector: 'a[href="#!/start-rent"]',
        // The app advertises its own count in the h1 ("1 Ergebnis", "Keine
        // Ergebnisse"). Advertised > 0 while we parsed 0 cards = a broken
        // selector; "Keine"/0 = a confirmed-empty page.
        resultCount: async (page) =>
            page.evaluate(() => {
                const text = document.querySelector("h1")?.textContent || "";
                if (/keine/i.test(text)) return 0;
                const m = text.match(/\d+/);
                return m ? parseInt(m[0], 10) : null;
            }),
    },
});
