import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { FriedrichshainEGUrl } from "./providerUrls";

const { minRoomSize, minRoomNumber, maxColdRent, maxWarmRent } = config.apartment;

async function extractFriedrichshainEGOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    return await page.evaluate(async () => {
        let isMultiPages = false;
        let results: Offer[] = [];

        let items = document.querySelectorAll(".wohnungsangebot-card");
        items &&
            (await Promise.all(
                Array.from(items).map(async (item) => {
                    const itemInnerText = (item as HTMLElement).innerText;
                    const title = item.querySelector("h4")?.innerText;
                    const address = (item.querySelector("p") as HTMLElement | undefined)?.innerText;

                    const relevantDistrict = await window.isInRelevantDistrict(address);

                    const isWBS = itemInnerText.includes("- WBS erforderlich");
                    const roomNumber = itemInnerText.split("Zimmer:")[1][1];
                    const transformedRoomNumber = (await window.transformSizeIntoValidNumber(roomNumber)) || 0;

                    const roomSize = itemInnerText.split("Größe:")[1].slice(0, 5);
                    const transformedSize = (await window.transformSizeIntoValidNumber(roomSize)) || 0;

                    const minRoomNumber = await window.getMinRoomNumber();
                    const minRoomSize = await window.getMinRoomSize();

                    const showItem =
                        title &&
                        address &&
                        !isWBS &&
                        relevantDistrict &&
                        transformedRoomNumber >= minRoomNumber &&
                        transformedSize >= minRoomSize;

                    if (showItem) {
                        results.push({
                            address,
                            id: `${title.split(" ").join("_")}_${address.split(" ").join("_")}`,
                            title: title,
                            region: relevantDistrict?.district,
                            link: item.querySelector(".details-button")?.getAttribute("href"),
                            size: roomSize,
                            rooms: roomNumber,
                        });
                    }
                }),
            ));

        return { offers: results, isMultiPages };
    });
}

export const getFriedrichshainEGOffers = createScraper({
    providerName: "Friedrichshain EG",
    url: FriedrichshainEGUrl,
    extractOffers: extractFriedrichshainEGOffers,
});
