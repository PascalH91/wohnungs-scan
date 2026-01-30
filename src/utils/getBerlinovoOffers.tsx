import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { berlinovoUrl } from "./providerUrls";

const { minRoomSize, minRoomNumber, maxColdRent, maxWarmRent } = config.apartment;

async function extractBerlinovoOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    return await page.evaluate(async () => {
        let isMultiPages = false;
        let results: Offer[] = [];
        let items = document.querySelectorAll(".view-content article");

        items &&
            (await Promise.all(
                Array.from(items).map(async (item) => {
                    const address = (item.querySelector(".features")?.firstElementChild as HTMLElement | undefined)
                        ?.innerText;

                    const relevantDistrict = await window.isInRelevantDistrict(address);
                    const title = (item.querySelector(".field--name-title") as HTMLElement | undefined)?.innerText;
                    const containsDisqualifyingPattern = await window.titleContainsDisqualifyingPattern(title);

                    const rooms = (
                        item.querySelector(".block-field-blocknodeapartmentfield-rooms") as HTMLElement | undefined
                    )?.innerText.split(" ")[1];

                    const transformedRooms = (await window.transformSizeIntoValidNumber(rooms)) || 100;

                    const minRoomNumber = await window.getMinRoomNumber();

                    if (
                        address &&
                        !containsDisqualifyingPattern &&
                        relevantDistrict &&
                        transformedRooms >= minRoomNumber
                    ) {
                        results.push({
                            address,
                            id: item?.getAttribute("data-history-node-id") || address,
                            title,
                            region: relevantDistrict?.district || "",
                            link:
                                "https://www.berlinovo.de/" +
                                item.querySelector(".title .field")?.getElementsByTagName("a")[0].getAttribute("href"),
                            size: "> 67m²",
                            rooms: transformedRooms,
                        });
                    }
                }),
            ));
        return { offers: results, isMultiPages };
    });
}

export const getBerlinovoOffers = createScraper({
    providerName: "Berlinovo",
    url: berlinovoUrl,
    extractOffers: extractBerlinovoOffers,
});
