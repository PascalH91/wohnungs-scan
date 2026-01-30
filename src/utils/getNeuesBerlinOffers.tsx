import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { neuesBerlinUrl } from "./providerUrls";

const { minRoomSize, minRoomNumber, maxColdRent, maxWarmRent } = config.apartment;

async function extractNeuesBerlinOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    return await page.evaluate(async () => {
        let isMultiPages = false;
        let results: Offer[] = [];

        let items = document.querySelectorAll(".frame-type-list");

        items &&
            (await Promise.all(
                Array.from(items).map(async (item: Element) => {
                    if (
                        (item as HTMLElement).innerText ===
                        "Derzeit verfügen wir über keine aktuellen Wohnungsangebote."
                    ) {
                        return;
                    }

                    const title = (item.querySelector("h2") as HTMLElement | undefined)?.innerText;
                    const specs = item.querySelectorAll(".row > div");
                    const address = (specs[0] as HTMLElement | undefined)?.innerText;
                    const relevantDistrict = await window.isInRelevantDistrict(address);
                    const rooms = (specs[1] as HTMLElement | undefined)?.innerText.split(" ")[0];
                    const transformedRooms = (await window.transformSizeIntoValidNumber(rooms)) || 100;
                    const size = (specs[2] as HTMLElement | undefined)?.innerText;
                    const transformedSize = (await window.transformSizeIntoValidNumber(size)) || 1000;

                    const minRoomNumber = await window.getMinRoomNumber();
                    const minRoomSize = await window.getMinRoomSize();

                    const showItem =
                        address &&
                        relevantDistrict &&
                        transformedRooms >= minRoomNumber &&
                        transformedSize >= minRoomSize;

                    if (showItem) {
                        results.push({
                            address,
                            id: item.getAttribute("data-uid") || address,
                            title,
                            region: relevantDistrict?.district || address.split(", ")[address.split(", ").length - 1],
                            link:
                                `https://www.neues-berlin.de` +
                                item.querySelector(".oi-wa-info")?.getElementsByTagName("a")[0].getAttribute("href"),
                            size,
                            rooms,
                        });
                    }
                }),
            ));
        return { offers: results, isMultiPages };
    });
}

export const getNeuesBerlinOffers = createScraper({
    providerName: "Neues Berlin",
    url: neuesBerlinUrl,
    extractOffers: extractNeuesBerlinOffers,
});
