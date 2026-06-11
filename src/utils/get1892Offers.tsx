import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { eg1892Url } from "./providerUrls";
import { transformSizeIntoValidNumber } from "./transformSizeIntoValidNumber";
import { containsRelevantCityCode } from "./containsRelevantCityCodes";
import { titleContainsDisqualifyingPattern } from "./titleContainsDisqualifyingPattern";

interface RawListing {
    objectId: string;
    title: string;
    plz: string;
    ort: string;
    strasse: string;
    zimmer: string;
    flaeche: string;
    gesamt: string;
}

async function extract1892Offers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    // Listings load asynchronously into #ispage after a loading spinner.
    // immosolve fills a card's title/address first and its NUMBER fields (rooms,
    // size) a moment later — so waiting only for the "N Immobilien" header count
    // would read still-placeholder number fields. Wait until a real listing's
    // size is actually populated (or the "no objects" message).
    await page.waitForFunction(
        () => {
            const ispage = document.querySelector("#ispage") as HTMLElement | null;
            if (!ispage) return false;
            if (ispage.innerText.includes("Momentan sind leider keine Objekte")) return true;
            const items = Array.from(document.querySelectorAll(".isobject"));
            return items.some((o) => {
                const id = o.querySelector('[id$=".id"]')?.textContent?.trim() || "";
                if (!/^\d+$/.test(id)) return false; // skip template cards
                const size = o.querySelector('[id$=".labels.wohnflaeche"]')?.textContent || "";
                return /\d/.test(size); // size field has populated with a number
            });
        },
        { timeout: 30000 },
    );

    // Extract RAW listing data in the browser. We deliberately do NOT use the
    // window.* helpers the base scraper exposes here: this immosolve page breaks
    // puppeteer's exposeFunction argument passing, so those bindings silently
    // receive `undefined` and return null/undefined. So we scrape raw fields and
    // do all parsing + filtering in Node below, with the real imported helpers.
    const rawListings: RawListing[] = await page.evaluate(() => {
        const label = (root: Element, suffix: string): string => {
            const el = root.querySelector(`[id$="${suffix}"]`);
            return el ? (el.textContent || "").replace(/\s+/g, " ").trim() : "";
        };
        return (
            Array.from(document.querySelectorAll(".isobject"))
                .map((item) => ({
                    objectId: label(item, ".id"),
                    title: label(item, ".labels.titel"),
                    plz: label(item, ".labels.plz"),
                    ort: label(item, ".labels.ort"),
                    strasse: label(item, ".show.labels.strasse"), // ", Street 7, VHS"
                    zimmer: label(item, ".labels.anzahlZimmer"),
                    flaeche: label(item, ".labels.wohnflaeche"),
                    gesamt: label(item, ".labels.monatlGesamtkosten"),
                }))
                // Real listings carry a numeric object id; template cards carry "ID".
                .filter((r) => /^\d+$/.test(r.objectId))
        );
    });

    const { minRoomSize, minRoomNumber, maxWarmRent } = config.apartment;
    const offers: Offer[] = [];

    for (const r of rawListings) {
        const address = `${r.plz} ${r.ort}${r.strasse}`.replace(/\s+/g, " ").trim();
        const rooms = transformSizeIntoValidNumber(r.zimmer) || 0;
        const size = transformSizeIntoValidNumber(r.flaeche) || 0;
        const rent = transformSizeIntoValidNumber(r.gesamt) || 0; // monthly Gesamtmiete (warm)
        const district = await containsRelevantCityCode(address);

        if (
            address &&
            district &&
            !titleContainsDisqualifyingPattern(r.title) &&
            rooms >= minRoomNumber &&
            size >= minRoomSize &&
            (rent === 0 || rent <= maxWarmRent) // 0 means rent not listed → don't exclude
        ) {
            offers.push({
                address,
                id: r.objectId,
                title: r.title,
                region: district.district || "",
                // No deep link is exposed (detail loads in-page via JS), so link
                // to the search page where the listing is shown.
                link: "https://hpm2.immosolve.eu/immosolve_presentation/pub/modern/2145111/HP/immo.jsp",
                size: String(size),
                rooms,
            });
        }
    }

    return { offers, isMultiPages: false };
}

export const get1892Offers = createScraper({
    providerName: "1892",
    stableId: true, // hidden numeric object id (the ".id" span)
    url: eg1892Url,
    waitForSelector: "#ispage",
    navigationTimeout: 60000,
    extractOffers: extract1892Offers,
    health: {
        listingSelector: ".isobject",
        anchorSelector: "#ispage",
    },
});
