import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { vineta89Url } from "./providerUrls";

const { minRoomSize, minRoomNumber, maxColdRent, maxWarmRent } = config.apartment;

async function extractVineta89Offers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    return await page.evaluate(async () => {
        let isMultiPages = false;
        let results: Offer[] = [];

        let item = document.querySelector("#content") as HTMLElement | undefined;

        item &&
            !!item.innerText &&
            results.push({
                address: "Neues Angebot",
                id: "VINETA_89",
                title: "Neues Angebot",
                region: "-",
                link: "https://vineta98.de/wohnungen/",
                size: "0",
                rooms: 0,
            });

        return { offers: results, isMultiPages };
    });
}

export const getVineta89Offers = createScraper({
    providerName: "Vineta 89",
    url: vineta89Url,
    extractOffers: extractVineta89Offers,
});
