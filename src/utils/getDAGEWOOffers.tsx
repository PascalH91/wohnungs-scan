import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { dagewoUrl } from "./providerUrls";

const { minRoomSize, minRoomNumber, maxColdRent, maxWarmRent } = config.apartment;

async function extractDAGEWOOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    return await page.evaluate(async () => {
        let isMultiPages = false;
        let results: Offer[] = [];
        let items = document.querySelectorAll(".article-list__item--immosearch");

        items &&
            (await Promise.all(
                Array.from(items).map(async (item) => {
                    const address = item.querySelector(".article__meta")?.innerHTML;

                    const title = item.querySelector(".article__title")?.innerHTML ?? "";
                    const containsDisqualifyingPattern = await window.titleContainsDisqualifyingPattern(title);
                    const link = item?.getElementsByTagName("a")?.[0]?.getAttribute("href");
                    const properties = item.querySelectorAll(".article__properties-item > span");
                    const isWBS = (properties?.[3] as HTMLElement | undefined)?.innerText === "mit WBS";
                    const size = (properties?.[1] as HTMLElement | undefined)?.innerText;
                    const shortenedSize = size ? +size.split(" ")[0].substr(0, 2) : 1000;
                    const rooms = (properties?.[0] as HTMLElement | undefined)?.innerText;
                    const shortenedRooms = rooms ? +rooms.split(" ")[0] : 100;

                    const minRoomNumber = await window.getMinRoomNumber();
                    const minRoomSize = await window.getMinRoomSize();

                    const filterConditions =
                        address &&
                        title &&
                        !containsDisqualifyingPattern &&
                        !isWBS &&
                        shortenedRooms >= minRoomNumber &&
                        shortenedSize >= minRoomSize;

                    if (!!filterConditions) {
                        results.push({
                            address,
                            id: link || address,
                            title,
                            region: "-",
                            link: `https://www.degewo.de/${link}`,
                            size: shortenedSize + " m²",
                            rooms: shortenedRooms,
                        });
                    }
                }),
            ));
        return { offers: results, isMultiPages };
    });
}

export const getDAGEWOOffers = createScraper({
    providerName: "DAGEWO",
    url: dagewoUrl,
    extractOffers: extractDAGEWOOffers,
});
