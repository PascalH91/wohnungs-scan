//@ts-nocheck

import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { immoscoutUrl } from "./providerUrls";

const { minRoomSize, minRoomNumber, maxColdRent, maxWarmRent } = config.apartment;

async function extractIMMOSCOUTOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    return await page.evaluate(async () => {
        let isMultiPages = false;
        let results: Offer[] = [];

        let test = document.getElementsByTagName("div")[0].innerText.trim();
        console.log(test);

        return { offers: results, isMultiPages };
    });
}

export const getIMMOSCOUTOffers = createScraper({
    providerName: "ImmobilienScout24",
    url: immoscoutUrl,
    waitForSelector: ".content-wrapper",
    extractOffers: extractIMMOSCOUTOffers,
});
