import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { gesobauUrl } from "./providerUrls";

const { minRoomSize, minRoomNumber, maxColdRent, maxWarmRent } = config.apartment;

async function extractGESOBAUOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    return await page.evaluate(async () => {
        const isMultiPages = Array.from(document.querySelectorAll(".pagination li")).length > 1;
        let results: Offer[] = [];
        let items = document.querySelectorAll(".basicTeaser__content");

        console.log("LENGTH", items.length);

        items &&
            (await Promise.all(
                Array.from(items).map(async (item) => {
                    const address = (item.querySelector(".basicTeaser__text > span") as HTMLElement | undefined)
                        ?.innerText;

                    const relevantDistrict = await window.isInRelevantDistrict(address);

                    const title = (item.querySelector(".basicTeaser__title") as HTMLElement | undefined)?.innerText;
                    const containsDisqualifyingPattern = await window.titleContainsDisqualifyingPattern(title);
                    const attributes = item.querySelectorAll(".apartment__info > span");

                    const link = item
                        .querySelector(".basicTeaser__title")
                        ?.getElementsByTagName("a")[0]
                        .getAttribute("href");

                    const showItem = !!(address && !containsDisqualifyingPattern && relevantDistrict && link);

                    if (showItem) {
                        results.push({
                            address,
                            id: item.getAttribute("id") || link,
                            title,
                            region: relevantDistrict?.district || "-",
                            link:
                                "https://www.gesobau.de" +
                                item
                                    .querySelector(".basicTeaser__title")
                                    ?.getElementsByTagName("a")[0]
                                    .getAttribute("href"),
                            size: attributes[1]?.innerHTML,
                            rooms: +attributes[0]?.innerHTML.trim()[0],
                        });
                    }
                }),
            ));
        return { offers: results, isMultiPages };
    });
}

export const getGESOBAUOffers = createScraper({
    providerName: "GESOBAU",
    url: gesobauUrl,
    waitForSelector: ".documentContent__content",
    extractOffers: extractGESOBAUOffers,
});
