import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { wbmUrl } from "./providerUrls";

const { minRoomSize, minRoomNumber, maxColdRent, maxWarmRent } = config.apartment;

async function extractWBMOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    return await page.evaluate(async () => {
        const isMultiPages = Array.from(document.querySelectorAll(".pagination li")).length > 3;

        let results: Offer[] = [];
        let items = document.querySelectorAll(".openimmo-search-list-item");

        items &&
            (await Promise.all(
                Array.from(items).map(async (item) => {
                    const title = item.querySelector("h2");
                    const address = (item.querySelector(".address") as HTMLElement | undefined)?.innerText;
                    const relevantDistrict = await window.isInRelevantDistrict(address);
                    const propertylist = item.getElementsByTagName("li");
                    const isWBS = Array.from(propertylist).some((prop) => prop.innerText === "WBS");
                    const roomSize = (item.querySelector(".main-property-size") as HTMLElement | undefined)?.innerText;
                    const transformedSize = (await window.transformSizeIntoValidNumber(roomSize)) || 0;
                    const roomNumber = Number(
                        (item.querySelector(".main-property-rooms") as HTMLElement | undefined)?.innerText,
                    );

                    const minRoomNumber = await window.getMinRoomNumber();
                    const minRoomSize = await window.getMinRoomSize();

                    const showItem =
                        title &&
                        address &&
                        !isWBS &&
                        relevantDistrict &&
                        roomNumber >= minRoomNumber &&
                        transformedSize >= minRoomSize;

                    if (showItem) {
                        results.push({
                            address,
                            id: `${item.getAttribute("data-id")}_${item.getAttribute("data-uid")}`,
                            title: title?.innerHTML,
                            region: relevantDistrict?.district || item.querySelector(".area")?.innerHTML,
                            link: `https://www.wbm.de${item.querySelector(".btn-holder")?.getElementsByTagName("a")[0].getAttribute("href")}`,
                            size: roomSize,
                            rooms: roomNumber,
                        });
                    }
                }),
            ));

        return { offers: results, isMultiPages };
    });
}

export const getWBMOffers = createScraper({
    providerName: "WBM",
    url: wbmUrl,
    extractOffers: extractWBMOffers,
});
