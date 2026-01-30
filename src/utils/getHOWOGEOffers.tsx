import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { howogeUrl } from "./providerUrls";

const { minRoomSize, minRoomNumber, maxColdRent, maxWarmRent } = config.apartment;

async function extractHOWOGEOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    return await page.evaluate(async () => {
        let isMultiPages = false;
        let results: Offer[] = [];
        let items = document.querySelectorAll(".flat-single-grid-item");

        items &&
            (await Promise.all(
                Array.from(items).map(async (item: Element) => {
                    const address = (item.querySelector(".address") as HTMLElement | undefined)?.innerText;
                    const title = (item.querySelector(".notice") as HTMLElement | undefined)?.innerText;
                    const relevantDistrict = await window.isInRelevantDistrict(address);
                    const containsDisqualifyingPattern = await window.titleContainsDisqualifyingPattern(title);
                    const attributes = item.querySelectorAll(".attributes > div .attributes-content");
                    const isNewBuildingProject = attributes.length === 2;

                    const rooms = isNewBuildingProject
                        ? 0
                        : Number((attributes[2] as HTMLElement | undefined)?.innerText || 0);
                    const size = isNewBuildingProject ? "" : (attributes[1] as HTMLElement | undefined)?.innerText;
                    const transformedSize = (await window.transformSizeIntoValidNumber(size)) || 1000;

                    const minRoomNumber = await window.getMinRoomNumber();
                    const minRoomSize = await window.getMinRoomSize();

                    const showItem =
                        address &&
                        !containsDisqualifyingPattern &&
                        relevantDistrict &&
                        !isNewBuildingProject &&
                        rooms >= minRoomNumber &&
                        transformedSize >= minRoomSize;

                    if (showItem) {
                        results.push({
                            address,
                            id: item.getAttribute("data-uid") || address,
                            title,
                            region: relevantDistrict?.district || address.split(", ")[address.split(", ").length - 1],
                            link: `https://www.howoge.de${item?.getElementsByTagName("a")[0].getAttribute("href")}`,
                            size,
                            rooms,
                        });
                    }
                }),
            ));
        return { offers: results, isMultiPages };
    });
}

export const getHOWOGEOffers = createScraper({
    providerName: "HOWOGE",
    url: howogeUrl,
    waitForSelector: ".flat-search",
    selectorTimeout: 0,
    navigationTimeout: 0,
    extractOffers: extractHOWOGEOffers,
});
