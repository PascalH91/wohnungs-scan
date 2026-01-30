import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { berolinaUrl } from "./providerUrls";

const { minRoomSize, minRoomNumber, maxColdRent, maxWarmRent } = config.apartment;

async function extractBerolinaOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    return await page.evaluate(async () => {
        let isMultiPages = false;
        let results: Offer[] = [];

        let item = document.querySelector(".entrytext") as HTMLElement | undefined;

        item &&
            !item.innerText.includes("Leider haben wir derzeit keine freien Wohnungen im Angebot") &&
            results.push({
                address: "Neues Angebot",
                id: "BEROLINA",
                title: "Neues Angebot",
                region: "-",
                link: "https://berolina.info/allgemein/wohnungssuche/",
                size: "0",
                rooms: 0,
            });

        return { offers: results, isMultiPages };
    });
}

export const getBerolinaOffers = createScraper({
    providerName: "Berolina",
    url: berolinaUrl,
    extractOffers: extractBerolinaOffers,
});
