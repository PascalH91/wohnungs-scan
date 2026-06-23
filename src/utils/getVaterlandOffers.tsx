import { Offer } from "@/types";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { vaterlandUrl } from "./providerUrls";

// Vaterland (a small co-op) lists each flat as a <table class="contenttable">
// inside #content, with all the key facts in the header row, pipe-separated:
//   "Burchardstraße 20 | 12103 Berlin | 2,5-Zimmer-Wohnung | ca. 65,49 qm | 2. OG links | ab sofort"
// There's no per-listing detail page, so we link to the listings page itself.
//
// Note: unlike the big providers we do NOT apply the room/size/district filter
// here — Vaterland rarely has anything, and its flats sit outside the usual
// search grid, so we surface every offer (only obvious disqualifiers are dropped).
async function extractVaterlandOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    const offers = await page.evaluate(async (listingsUrl) => {
        const tables = Array.from(document.querySelectorAll("#content table.contenttable"));
        const results: Offer[] = [];

        await Promise.all(
            tables.map(async (table) => {
                const headerEl = table.querySelector("thead th") || table.querySelector("th");
                const header = (headerEl as HTMLElement | null)?.textContent?.replace(/\s+/g, " ").trim() ?? "";
                // Only real listing tables carry a "…-Zimmer-Wohnung" header.
                if (!/zimmer/i.test(header)) return;

                const parts = header.split("|").map((s) => s.trim());
                const street = parts[0] || "";
                const plzPart = parts.find((p) => /\b1[0-4]\d{3}\b/.test(p)) || "";
                const address = [street, plzPart].filter(Boolean).join(", ");

                const roomsMatch = header.match(/([\d.,]+)\s*-?\s*Zimmer/i);
                const sizeMatch = header.match(/ca\.?\s*([\d.,]+)\s*(?:qm|m²)/i);
                const rooms = roomsMatch ? parseFloat(roomsMatch[1].replace(",", ".")) : undefined;
                const size = sizeMatch ? parseFloat(sizeMatch[1].replace(",", ".")) : undefined;

                const roomType = parts.find((p) => /zimmer/i.test(p)) || "";
                const rest = parts.slice(parts.indexOf(roomType) + 1).filter((p) => p && !/qm|m²/i.test(p));
                const title = [roomType, ...rest].filter(Boolean).join(" · ");

                const containsDisqualifyingPattern = await window.titleContainsDisqualifyingPattern(header);

                if (address && !containsDisqualifyingPattern) {
                    results.push({
                        address,
                        id: header, // no provider id — header line is unique per unit
                        title: title || "Wohnungsangebot",
                        region: "-",
                        link: listingsUrl,
                        size: size != null ? size + " m²" : undefined,
                        rooms,
                    });
                }
            }),
        );

        return results;
    }, vaterlandUrl);

    return { offers, isMultiPages: false };
}

export const getVaterlandOffers = createScraper({
    providerName: "Vaterland",
    url: vaterlandUrl,
    extractOffers: extractVaterlandOffers,
    health: {
        listingSelector: "#content table.contenttable",
        anchorSelector: "#content",
    },
});
