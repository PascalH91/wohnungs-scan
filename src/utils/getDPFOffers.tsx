import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { transformPrice } from "./transformPrice";
import { dpfUrl } from "./providerUrls";

const { minRoomSize, minRoomNumber, maxColdRent, maxWarmRent } = config.apartment;

async function extractDPFOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    await page.exposeFunction("transformPriceIntoValidNumber", (price: string) => transformPrice(price));

    return await page.evaluate(async () => {
        let isMultiPages = false;
        let results: Offer[] = [];

        let items = document.querySelectorAll(".immo-a-info");

        items &&
            (await Promise.all(
                Array.from(items).map(async (item) => {
                    const title = item.querySelector("h3")?.innerText;
                    const address = (item.querySelector(".trenner li") as HTMLElement | undefined)?.innerText;
                    const link = item.querySelector("h3")?.getElementsByTagName("a")[0].getAttribute("href");
                    const relevantDistrict = await window.isInRelevantDistrict(address);

                    const attributes = item.querySelectorAll(".immo-data");

                    const size = (attributes[1] as HTMLElement | undefined)?.innerText.trim();
                    const transformedSize = (await window.transformSizeIntoValidNumber(size)) || 1000;
                    const rooms = (attributes[2] as HTMLElement | undefined)?.innerText.trim();
                    const transformedRooms = (await window.transformSizeIntoValidNumber(rooms)) || 100;
                    const price = (attributes[0] as HTMLElement | undefined)?.innerText.trim();
                    const transformedColdPrice = (await window.transformPriceIntoValidNumber(price)) || 0;

                    const minRoomNumber = await window.getMinRoomNumber();
                    const minRoomSize = await window.getMinRoomSize();
                    const maxColdRent = await window.getMaxColdRent();

                    const showItem =
                        address &&
                        transformedSize >= minRoomSize &&
                        transformedRooms >= minRoomNumber &&
                        transformedColdPrice <= maxColdRent &&
                        relevantDistrict &&
                        link;

                    if (showItem) {
                        results.push({
                            address,
                            id: link,
                            title,
                            region: relevantDistrict?.district || "-",
                            link,
                            size,
                            rooms,
                        });
                    }
                }),
            ));
        return { offers: results, isMultiPages };
    });
}

export const getDPFOffers = createScraper({
    providerName: "DPF",
    url: dpfUrl,
    extractOffers: extractDPFOffers,
});
