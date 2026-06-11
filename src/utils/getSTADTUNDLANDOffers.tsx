import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { stadtUndLandUrl } from "./providerUrls";

const { selectorTimeout } = config.scraping;

// Stable across deploys — the CSS-module class names (Teaser_immoTeaser__…) are
// content-hashed and change on every build, so we key on the aria-labelledby
// attribute (`headline-immo-<immo-id>`) instead.
const ARTICLE_SELECTOR = 'article[aria-labelledby^="headline-immo-"]';

// Cap on "Mehr Ergebnisse laden" clicks so a misbehaving button can't loop
// forever. Each click loads a chunk; the current result set fits in 1–2 clicks.
const MAX_LOAD_MORE = 20;

/**
 * Stadt und Land migrated to a Next.js single-page app: results render
 * client-side as <article aria-labelledby="headline-immo-…"> cards, and instead
 * of numbered pages there is a "Mehr Ergebnisse laden" button that appends the
 * next chunk. We click it until it disappears so the whole result set is in the
 * DOM, then extract every card.
 */
async function extractSTADTUNDLANDOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    await page.waitForSelector(ARTICLE_SELECTOR, { timeout: selectorTimeout }).catch(() => {});

    // Load every result chunk by repeatedly pressing "Mehr Ergebnisse laden".
    const clicks = await page.evaluate(async (maxClicks) => {
        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
        const findBtn = () =>
            Array.from(document.querySelectorAll("button")).find((b) =>
                /mehr ergebnisse laden/i.test(b.textContent || ""),
            );
        const countArticles = () =>
            document.querySelectorAll('article[aria-labelledby^="headline-immo-"]').length;

        let clicked = 0;
        for (let i = 0; i < maxClicks; i++) {
            const btn = findBtn();
            if (!btn || btn.disabled) break;
            const before = countArticles();
            btn.click();
            clicked++;
            // Wait (≤6s) for the new chunk to render before the next click.
            for (let w = 0; w < 30; w++) {
                await sleep(200);
                if (countArticles() > before) break;
            }
        }
        return clicked;
    }, MAX_LOAD_MORE);

    const offers = await page.evaluate(async (selector) => {
        const results: Offer[] = [];
        const items = document.querySelectorAll(selector);

        await Promise.all(
            Array.from(items).map(async (item) => {
                const headline = (item.querySelector("h3") as HTMLElement | null)?.textContent ?? "";
                const address = (item.querySelector("p") as HTMLElement | null)?.textContent?.trim() ?? "";
                const href = item.closest("a")?.getAttribute("href") ?? item.querySelector("a")?.getAttribute("href");
                const id = item.getAttribute("aria-labelledby")?.replace("headline-immo-", "") ?? "";

                // Headline reads e.g. "3 Zimmer 59,21 m² – Mausohrweg 4 mit Garten".
                const roomsMatch = headline.match(/([\d.,]+)\s*Zimmer/);
                const sizeMatch = headline.match(/([\d.,]+)\s*m²/);
                const rooms = roomsMatch ? parseFloat(roomsMatch[1].replace(",", ".")) : 100;
                const size = sizeMatch ? parseFloat(sizeMatch[1].replace(",", ".")) : 1000;

                const relevantDistrict = await window.isInRelevantDistrict(address);
                const containsDisqualifyingPattern = await window.titleContainsDisqualifyingPattern(headline);
                const minRoomNumber = await window.getMinRoomNumber();
                const minRoomSize = await window.getMinRoomSize();

                const showItem =
                    address &&
                    relevantDistrict &&
                    !containsDisqualifyingPattern &&
                    rooms >= minRoomNumber &&
                    size >= minRoomSize;

                if (showItem) {
                    results.push({
                        address,
                        id: id || address,
                        title: headline,
                        region: relevantDistrict?.district || "-",
                        link: href ? `https://www.stadtundland.de${href}` : null,
                        size: size + " m²",
                        rooms,
                    });
                }
            }),
        );

        return results;
    }, ARTICLE_SELECTOR);

    // A single chunk is the whole result set on most queries; >1 click means the
    // listing genuinely spanned multiple "pages".
    return { offers, isMultiPages: clicks > 1 };
}

export const getSTADTUNDLANDOffers = createScraper({
    providerName: "Stadt und Land",
    url: stadtUndLandUrl,
    stableId: true,
    extractOffers: extractSTADTUNDLANDOffers,
});
