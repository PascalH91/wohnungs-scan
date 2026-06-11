import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { paradiesUrl } from "./providerUrls";

const { minRoomSize, minRoomNumber, maxColdRent, maxWarmRent } = config.apartment;

async function extractParadiesOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    return await page.evaluate(async () => {
        let isMultiPages = false;
        let results: Offer[] = [];

        let item = document.querySelector("p") as HTMLElement | undefined;

        item &&
            !item.innerText.includes("Versuchen Sie es zu einem späteren Zeitpunkt nochmals.") &&
            results.push({
                address: "Neues Angebot",
                id: "PARADIES",
                title: "Neues Angebot",
                region: "-",
                link: "https://abg-paradies.de/wohnungsangebote/",
                size: "0",
                rooms: 0,
            });

        return { offers: results, isMultiPages };
    });
}

export const getParadiesOffers = createScraper({
    providerName: "Paradies",
    url: paradiesUrl,
    extractOffers: extractParadiesOffers,
    // Presence-only and intentionally without an anchor: this scraper keys on a
    // bare <p> + German text match, with no stable structural element to probe.
    health: {
        presenceOnly: true,
    },
});
