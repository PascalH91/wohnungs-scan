import { Offer, ScraperResponse } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { deutscheWohnenUrl } from "./providerUrls";

const { minRoomSize, minRoomNumber, maxColdRent } = config.apartment;

/**
 * Extract offers from Deutsche Wohnen page
 */
async function extractDeutscheWohnenOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    return await page.evaluate(async () => {
        const isMultiPages = Number(document.querySelector(".pagination input")?.getAttribute("max")) > 3;
        let results: Offer[] = [];
        let items = document.querySelectorAll(".content-card");

        items &&
            (await Promise.all(
                Array.from(items).map(async (item) => {
                    const title = item.querySelector("h2")?.innerText;
                    const address = (item.querySelector(".rte") as HTMLElement).innerText;
                    const relevantDistrict = await window.isInRelevantDistrict(address);

                    const specs = (item.querySelector(".features-wrap .badge") as HTMLElement).innerText?.split(" ");
                    const size = specs[0];
                    const transformedSize = (await window.transformSizeIntoValidNumber(size)) || 1000;
                    const minRoomSize = await window.getMinRoomSize();

                    const showItem = title && address && relevantDistrict && transformedSize > minRoomSize;

                    if (showItem) {
                        results.push({
                            id: item.getAttribute("id") || address,
                            address,
                            title,
                            region: relevantDistrict?.district,
                            link: `https://www.deutsche-wohnen.com${item?.getElementsByTagName("a")[0].getAttribute("href")}`,
                            size: transformedSize + "m²",
                            rooms: specs[1][1],
                        });
                    }
                }),
            ));
        return { offers: results, isMultiPages };
    });
}

/**
 * Scrape Deutsche Wohnen for available apartments
 */
export const getDEUTSCHEWOHNENOffers = createScraper({
    providerName: "Deutsche Wohnen",
    url: deutscheWohnenUrl,
    waitForSelector: ".teaser-xl-real-estate",
    selectorTimeout: 2000,
    extractOffers: extractDeutscheWohnenOffers,
});
