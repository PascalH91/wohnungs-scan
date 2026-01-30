import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { stadtUndLandUrl } from "./providerUrls";

const { minRoomSize, minRoomNumber, maxColdRent, maxWarmRent } = config.apartment;

async function extractSTADTUNDLANDOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    return await page.evaluate(async () => {
        let isMultiPages = false;
        let results: Offer[] = [];
        let items = document.querySelectorAll(".SP-TeaserList__item");

        items &&
            (await Promise.all(
                Array.from(items).map(async (item) => {
                    const title = item.querySelector("h2")?.innerText;
                    const tableEntries = item.getElementsByTagName("td");
                    const address1 = tableEntries[1].innerText;
                    const address2 = tableEntries[2].innerText;

                    const relevantDistrict1 = await window.isInRelevantDistrict(address1);
                    const relevantDistrict2 = await window.isInRelevantDistrict(address2);

                    const containsDisqualifyingPattern = await window.titleContainsDisqualifyingPattern(title);

                    const relevantDistrict = relevantDistrict1 || relevantDistrict2;

                    const showItem = title && relevantDistrict && !containsDisqualifyingPattern;

                    if (showItem) {
                        results.push({
                            address: address1 || address2,
                            id: tableEntries[0].innerText || address1 || address2,
                            title,
                            region: relevantDistrict?.district || " - ",
                            link: `https://www.stadtundland.de${item.querySelector(".SP-Teaser__links")?.getElementsByTagName("a")[0].getAttribute("href")}`,

                            size: tableEntries[3]?.innerText,
                            rooms: tableEntries[2]?.innerText,
                        });
                    }
                }),
            ));
        return { offers: results, isMultiPages };
    });
}

export const getSTADTUNDLANDOffers = createScraper({
    providerName: "Stadt und Land",
    url: stadtUndLandUrl,
    extractOffers: extractSTADTUNDLANDOffers,
});
