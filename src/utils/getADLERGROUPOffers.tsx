import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { adlergroupUrl } from "./providerUrls";

const { minRoomSize, minRoomNumber, maxColdRent, maxWarmRent } = config.apartment;

async function extractADLERGROUPOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    return await page.evaluate(async () => {
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
                    const title = (item.querySelector(".object-headline") as HTMLElement | undefined)?.innerText;
                    const containsDisqualifyingPattern = await window.titleContainsDisqualifyingPattern(title);

                    const roomSize = parseFloat(infoMap[1].split(" ")[0]);
                    const roomNumber = parseFloat(infoMap[3].split(" ")[0]);

                    if (
                        address &&
                        !containsDisqualifyingPattern &&
                        relevantDistrict &&
                        roomNumber >= 3 &&
                        roomSize >= 75
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
                            size: roomSize,
                            rooms: roomNumber,
                        });
                    }
                }),
            ));
        return { offers: results, isMultiPages };
    });
}

export const getADLERGROUPOffers = createScraper({
    providerName: "Adler Group",
    url: adlergroupUrl,
    waitForSelector: ".search-results-inner",
    extractOffers: extractADLERGROUPOffers,
});
