import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { solidariaetUrl } from "./providerUrls";

const { minRoomSize, minRoomNumber, maxColdRent, maxWarmRent } = config.apartment;

async function extractSolidaritaetOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    return await page.evaluate(async () => {
        let isMultiPages = false;
        let results: Offer[] = [];

        let items = document.querySelectorAll(".frm_no_entries");

        !items &&
            results.push({
                address: "Neues Angebot",
                id: "SOLIDARITAET",
                title: "Neues Angebot",
                region: "-",
                link: "https://wg-solidaritaet.de/wohnen/mietangebote/",
                size: "0",
                rooms: 0,
            });

        return { offers: results, isMultiPages };
    });
}

export const getSolidaritaetOffers = createScraper({
    providerName: "Solidarität",
    url: solidariaetUrl,
    extractOffers: extractSolidaritaetOffers,
});
