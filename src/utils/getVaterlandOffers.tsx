import { Offer } from "@/types";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { vaterlandUrl } from "./providerUrls";

// Vaterland (a small co-op) lists each flat as a <table class="contenttable">
// inside #content, with all the key facts in the header row, pipe-separated:
//   "Burchardstraße 20 | 12103 Berlin | 2,5-Zimmer-Wohnung | ca. 65,49 qm | 2. OG links | ab sofort"
// There's no per-listing detail page, so we link to the listings page itself.
// Filtered like the other providers: relevant district (by PLZ in the address),
// minimum rooms/size, and the shared disqualifying-title patterns.
async function extractVaterlandOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    const offers = await page.evaluate(async (listingsUrl) => {
        const minRoomNumber = await window.getMinRoomNumber();
        const minRoomSize = await window.getMinRoomSize();

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
                const rooms = roomsMatch ? parseFloat(roomsMatch[1].replace(",", ".")) : 100;
                const size = sizeMatch ? parseFloat(sizeMatch[1].replace(",", ".")) : 1000;

                const roomType = parts.find((p) => /zimmer/i.test(p)) || "";
                const rest = parts.slice(parts.indexOf(roomType) + 1).filter((p) => p && !/qm|m²/i.test(p));
                const title = [roomType, ...rest].filter(Boolean).join(" · ");

                const relevantDistrict = await window.isInRelevantDistrict(address);
                const containsDisqualifyingPattern = await window.titleContainsDisqualifyingPattern(header);

                const showItem =
                    address &&
                    relevantDistrict &&
                    !containsDisqualifyingPattern &&
                    rooms >= minRoomNumber &&
                    size >= minRoomSize;

                if (showItem) {
                    results.push({
                        address,
                        id: header, // no provider id — header line is unique per unit
                        title: title || "Wohnungsangebot",
                        region: relevantDistrict?.district || "-",
                        link: listingsUrl,
                        size: size + " m²",
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
