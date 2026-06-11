import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { gewobagUrl } from "./providerUrls";

const { navigationTimeout } = config.scraping;

// Safety cap so a misbehaving pagination nav can never spin forever. gewobag
// currently has ~3 pages of results; 30 leaves comfortable head-room.
const MAX_PAGES = 30;

/**
 * Extract every offer on the page currently loaded in `page`, plus the absolute
 * URL of the next pagination page (or null when on the last page).
 *
 * gewobag paginates via WordPress `page-numbers` links (`/mietangebote/page/N/?…`);
 * the live "next" link preserves the active filters, so we follow it rather than
 * synthesising page URLs.
 */
async function extractPage(page: Page): Promise<{ offers: Offer[]; nextUrl: string | null }> {
    return await page.evaluate(async () => {
        let results: Offer[] = [];
        let items = document.querySelectorAll("article");

        items &&
            (await Promise.all(
                Array.from(items).map(async (item) => {
                    const address = item.querySelector("address")?.innerText;
                    const relevantDistrict = await window.isInRelevantDistrict(address);
                    const title = item.querySelector(".angebot-title")?.innerHTML ?? "";
                    const containsDisqualifyingPattern = await window.titleContainsDisqualifyingPattern(title);

                    if (address && !containsDisqualifyingPattern && relevantDistrict) {
                        results.push({
                            address,
                            id: item?.getAttribute("id") || address,
                            title,
                            region: relevantDistrict?.district || item.querySelector(".angebot-region > td")?.innerHTML,
                            link: item
                                .querySelector(".angebot-footer")
                                ?.getElementsByTagName("a")[0]
                                .getAttribute("href"),
                            size: (item.querySelector(".angebot-area > td") as HTMLElement | undefined)?.innerText
                                ?.split("|")[1]
                                .trim(),
                            rooms: Number(
                                (item.querySelector(".angebot-area > td") as HTMLElement | undefined)?.innerText?.[0] ||
                                    0,
                            ),
                        });
                    }
                }),
            ));

        // Follow the live "next page" link; it preserves the active filters.
        // Absent means we're on the last page.
        const nextLink = document.querySelector("a.next.page-numbers");
        const nextHref = nextLink?.getAttribute("href");
        const nextUrl = nextHref ? new URL(nextHref, window.location.href).href : null;

        return { offers: results, nextUrl };
    });
}

async function extractGewobagOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    const byId = new Map<string, Offer>();
    let pagesVisited = 0;

    // Page 1 is already loaded by the base scraper's initial navigation.
    let nextUrl: string | null = null;
    do {
        if (nextUrl) {
            await page.goto(nextUrl, { waitUntil: "networkidle2", timeout: navigationTimeout });
        }

        const { offers, nextUrl: next } = await extractPage(page);
        // Dedupe across pages defensively (gewobag's `post-…` id is stable).
        offers.forEach((offer) => byId.set(offer.id, offer));

        pagesVisited += 1;
        nextUrl = next;
    } while (nextUrl && pagesVisited < MAX_PAGES);

    return { offers: Array.from(byId.values()), isMultiPages: pagesVisited > 1 };
}

export const getGEWOBAGOffers = createScraper({
    providerName: "GEWOBAG",
    url: gewobagUrl,
    extractOffers: extractGewobagOffers,
});
