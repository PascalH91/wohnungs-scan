import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { wgVorwaertsUrl } from "./providerUrls";

const { minRoomSize, minRoomNumber, maxColdRent, maxWarmRent } = config.apartment;

async function extractWGVorwaertsOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    return await page.evaluate(async () => {
        let isMultiPages = false;
        let results: Offer[] = [];

        let item = document.querySelector(".entry-content") as HTMLElement | undefined;

        item &&
            !item.innerText.includes("Derzeit haben wir leider keine freien Wohnungen zur Verfügung.") &&
            results.push({
                address: "Neues Angebot",
                id: "WG_VORWAERTS",
                title: "Neues Angebot",
                region: "-",
                link: "https://www.wg-vorwaerts.de/wohnungssuche/",
                size: "0",
                rooms: 0,
            });

        return { offers: results, isMultiPages };
    });
}

export const getWGVorwaertsOffers = createScraper({
    providerName: "WG Vorwärts",
    url: wgVorwaertsUrl,
    extractOffers: extractWGVorwaertsOffers,
});
