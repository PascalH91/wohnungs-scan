import { Offer } from "@/types";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { ewgPankowUrl } from "./providerUrls";

const LISTING_SELECTOR = "article.type-wohnungen";

/**
 * EWG Pankow lists flats as posts of a "wohnungen" custom post type in Elementor
 * post grids. When nothing is available, the grid holds a single placeholder
 * post ("Aktuell ist leider kein Wohnungsangebot verfügbar."). Every other post
 * of that type is a real offer, so we report each one individually. The same
 * post appears in several grids (desktop/mobile/sidebar) — deduped by link.
 */
async function extractEWGPankowOffers(
    page: Page,
): Promise<{ offers: Offer[]; isMultiPages: boolean; confirmedEmpty: boolean }> {
    return await page.evaluate(async (listingSelector) => {
        const byLink = new Map<string, Offer>();
        let placeholderSeen = false;

        for (const item of Array.from(document.querySelectorAll(listingSelector))) {
            const titleLink = item.querySelector(".elementor-post__title a");
            const title = titleLink?.textContent?.replace(/\s+/g, " ").trim() ?? "";
            const link = titleLink?.getAttribute("href") ?? "";

            const isPlaceholder = /kein Wohnungsangebot/i.test(title) || link.includes("kein-wohnungsangebot");
            if (isPlaceholder) placeholderSeen = true;
            if (!title || !link || isPlaceholder || byLink.has(link)) continue;

            const containsDisqualifyingPattern = await window.titleContainsDisqualifyingPattern(title);
            if (containsDisqualifyingPattern) continue;

            byLink.set(link, {
                address: title,
                id: link,
                title,
                region: "Pankow",
                link,
                size: "0",
                rooms: 0,
            });
        }

        // Placeholder alone = confirmed empty → ends the episode, so a flat that is
        // re-published later (same link) alerts again.
        return {
            offers: Array.from(byLink.values()),
            isMultiPages: false,
            confirmedEmpty: placeholderSeen && byLink.size === 0,
        };
    }, LISTING_SELECTOR);
}

export const getEWGPankowOffers = createScraper({
    providerName: "EWG Pankow",
    url: ewgPankowUrl,
    stableId: true, // post permalink
    extractOffers: extractEWGPankowOffers,
    // The placeholder post is always there when the list is empty, so a missing
    // "wohnungen" post altogether means the page changed.
    health: {
        presenceOnly: true,
        anchorSelector: LISTING_SELECTOR,
    },
});
