import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { eg1892Url } from "./providerUrls";

const { minRoomSize, minRoomNumber, maxColdRent, maxWarmRent } = config.apartment;

async function extract1892Offers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    await page.waitForNavigation();

    return await page.evaluate(async () => {
        let isMultiPages = false;
        let results: Offer[] = [];

        let item = document.querySelector("#ispage") as HTMLElement | undefined;

        item &&
            !item.innerText.includes("Momentan sind leider keine Objekte in unserem Onlineangebot verfügbar.") &&
            results.push({
                address: "Neues Angebot",
                id: "1892",
                title: "Neues Angebot",
                region: "-",
                link: "https://hpm2.immosolve.eu/immosolve_presentation/pub/modern/2145111/HP/immo.jsp",
                size: "0",
                rooms: 0,
            });

        return { offers: results, isMultiPages };
    });
}

export const get1892Offers = createScraper({
    providerName: "1892",
    url: eg1892Url,
    waitForSelector: "#ispage",
    navigationTimeout: 600000,
    extractOffers: extract1892Offers,
});
