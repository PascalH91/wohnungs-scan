import { Offer } from "@/types";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { dagewoUrl } from "./providerUrls";
import { config } from "@/config";

const { navigationTimeout, selectorTimeout } = config.scraping;

// Safety cap so a misbehaving pagination nav can never spin forever. degewo
// currently has ~7 pages of results; 30 leaves comfortable head-room.
const MAX_PAGES = 30;

const TEASER_LIST = "#immo-teaser-list";

/**
 * Extract every listing on the page currently loaded in `page`, plus the
 * absolute URL of the next pagination page (or null when on the last page).
 *
 * degewo's search has no server-side room/size filters on this URL, so the full
 * Berlin result set is returned and filtered client-side here. Each pagination
 * link carries its own TYPO3 `cHash`, so we can't synthesise page URLs — we read
 * the live "next" link's href instead.
 */
async function extractPage(page: Page): Promise<{ offers: Offer[]; nextUrl: string | null }> {
    return await page.evaluate(async () => {
        const minRoomNumber = await window.getMinRoomNumber();
        const minRoomSize = await window.getMinRoomSize();

        const list = document.querySelector("#immo-teaser-list");
        const teasers = list
            ? Array.from(list.querySelectorAll(".c-teaser")).filter((t) =>
                  t.querySelector('a[href*="/immosuche/details/"]'),
              )
            : [];

        const results: Offer[] = [];

        await Promise.all(
            teasers.map(async (item) => {
                const titleEl = item.querySelector(".c-headline a");
                const title = titleEl?.textContent?.trim() ?? "";
                const link = titleEl?.getAttribute("href") ?? null;
                const address = item.querySelector(".c-copy > p")?.textContent?.trim();

                // Definition list holds the key facts as term/definition pairs,
                // e.g. { "946,35 €": "Warmmiete", "1": "Zimmer", "45,52": "m²" }.
                const facts: Record<string, string> = {};
                item.querySelectorAll(".c-definition-list__item").forEach((entry) => {
                    const term = entry.querySelector(".c-definition-list__term")?.textContent?.trim();
                    const def = entry.querySelector(".c-definition-list__definition")?.textContent?.trim();
                    if (term && def) facts[def] = term;
                });

                const rooms = facts["Zimmer"] ? parseInt(facts["Zimmer"], 10) : 100;
                const size = facts["m²"] ? parseFloat(facts["m²"].replace(",", ".")) : 1000;

                const tags = Array.from(item.querySelectorAll(".c-tag__label")).map((t) =>
                    (t.textContent ?? "").trim().toLowerCase(),
                );
                const isWBS = tags.some((t) => t.includes("wbs"));

                const containsDisqualifyingPattern = await window.titleContainsDisqualifyingPattern(title);

                const filterConditions =
                    address &&
                    title &&
                    !containsDisqualifyingPattern &&
                    !isWBS &&
                    rooms >= minRoomNumber &&
                    size >= minRoomSize;

                if (filterConditions) {
                    results.push({
                        address,
                        id: link || address,
                        title,
                        region: "-",
                        link: link ? `https://www.degewo.de${link}` : null,
                        size: size + " m²",
                        rooms,
                    });
                }
            }),
        );

        // Follow the live "next page" link; it carries the correct cHash. Absent
        // or disabled means we're on the last page.
        const nextLink = document.querySelector(".c-pagination__link--next");
        const nextHref = nextLink?.getAttribute("href");
        const disabled =
            !nextLink ||
            nextLink.classList.contains("is-disabled") ||
            nextLink.getAttribute("aria-disabled") === "true";
        const nextUrl = !disabled && nextHref ? new URL(nextHref, window.location.href).href : null;

        return { offers: results, nextUrl };
    });
}

async function extractDAGEWOOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    const byId = new Map<string, Offer>();
    let pagesVisited = 0;

    // Page 1 is already loaded by the base scraper's initial navigation.
    let nextUrl: string | null = null;
    do {
        if (nextUrl) {
            await page.goto(nextUrl, { waitUntil: "networkidle2", timeout: navigationTimeout });
        }
        await page.waitForSelector(TEASER_LIST, { timeout: selectorTimeout }).catch(() => {});

        const { offers, nextUrl: next } = await extractPage(page);
        // Dedupe across pages defensively (stable per-listing link is the key).
        offers.forEach((offer) => byId.set(offer.id, offer));

        pagesVisited += 1;
        nextUrl = next;
    } while (nextUrl && pagesVisited < MAX_PAGES);

    return { offers: Array.from(byId.values()), isMultiPages: pagesVisited > 1 };
}

export const getDAGEWOOffers = createScraper({
    providerName: "DAGEWO",
    url: dagewoUrl,
    stableId: true,
    extractOffers: extractDAGEWOOffers,
    health: {
        baselineEmpty: true,
        listingSelector: "#immo-teaser-list .c-teaser",
        anchorSelector: "#immo-teaser-list",
        // degewo renders "66 Ergebnisse" in .results-count on every page.
        resultCount: (page) =>
            page.evaluate(() => {
                const text = document.querySelector(".results-count")?.textContent ?? "";
                const match = text.match(/(\d+)\s*Ergebnis/i);
                return match ? parseInt(match[1], 10) : null;
            }),
    },
});
