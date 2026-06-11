import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { adlergroupUrl } from "./providerUrls";

const { minRoomSize, minRoomNumber } = config.apartment;

async function extractADLERGROUPOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    // minRoomNumber/minRoomSize are passed into the browser context as args,
    // since page.evaluate() can't see Node-side closures like `config`.
    return await page.evaluate(
        async (minRoomNumber, minRoomSize) => {
            let isMultiPages = false;
            let results: Offer[] = [];
            let items = document.querySelectorAll(".search-results-inner .row > div");

            items &&
                (await Promise.all(
                    Array.from(items).map(async (item) => {
                        const infos = item.querySelectorAll("td");
                        const infoMap = Array.from(infos).map((a) => a.innerText);
                        const address = `${infoMap[0]}, ${infoMap[2]}`;
                        const relevantDistrict = await window.isInRelevantDistrict(address);
                        const title = (item.querySelector(".object-headline") as HTMLElement | null)?.innerText ?? "";
                        const containsDisqualifyingPattern = await window.titleContainsDisqualifyingPattern(title);

                        const roomSize = parseFloat(infoMap[1].split(" ")[0]);
                        const roomNumber = parseFloat(infoMap[3].split(" ")[0]);

                        if (
                            address &&
                            !containsDisqualifyingPattern &&
                            relevantDistrict &&
                            roomNumber >= minRoomNumber &&
                            roomSize >= minRoomSize
                        ) {
                            results.push({
                                address,
                                id: item?.getAttribute("data-object-id") || address,
                                title,
                                region: relevantDistrict?.district || "",
                                link:
                                    "https://www.adler-group.com/" +
                                    item
                                        .querySelector(".object-headline")
                                        ?.getElementsByTagName("a")[0]
                                        .getAttribute("href"),
                                size: String(roomSize),
                                rooms: roomNumber,
                            });
                        }
                    }),
                ));
            return { offers: results, isMultiPages };
        },
        minRoomNumber,
        minRoomSize,
    );
}

export const getADLERGROUPOffers = createScraper({
    providerName: "Adler Group",
    url: adlergroupUrl,
    waitForSelector: ".search-results-inner",
    extractOffers: extractADLERGROUPOffers,
    health: {
        listingSelector: ".search-results-inner .row > div",
        anchorSelector: ".search-results-inner",
    },
});
