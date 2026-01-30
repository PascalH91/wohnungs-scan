import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { vaterlandUrl } from "./providerUrls";

const { minRoomSize, minRoomNumber, maxColdRent, maxWarmRent } = config.apartment;

async function extractVaterlandOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    return await page.evaluate(async () => {
        let isMultiPages = false;
        let results: Offer[] = [];

        let item = document.querySelector("#content") as HTMLElement | undefined;
        item &&
            !item.innerText.includes("Momentan können wir Ihnen keine freien Wohnungen anbieten.") &&
            results.push({
                address: "Neues Angebot",
                id: "VATERLAND",
                title: "Neues Angebot",
                region: "-",
                link: "https://www.bg-vaterland.de/index.php?id=31",
                size: "0",
                rooms: 0,
            });

        return { offers: results, isMultiPages };
    });
}

export const getVaterlandOffers = createScraper({
    providerName: "Vaterland",
    url: vaterlandUrl,
    extractOffers: extractVaterlandOffers,
});
