import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { gewobagUrl } from "./providerUrls";

const { maxWarmRent, minRoomSize, minRoomNumber } = config.apartment;

async function extractGewobagOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    return await page.evaluate(async () => {
        let isMultiPages = false;
        let results: Offer[] = [];
        let items = document.querySelectorAll("article");

        items &&
            (await Promise.all(
                Array.from(items).map(async (item) => {
                    const address = item.querySelector("address")?.innerText;
                    const relevantDistrict = await window.isInRelevantDistrict(address);
                    const title = item.querySelector(".angebot-title")?.innerHTML ?? "";
                    const containsDisqualifyingPattern = await window.titleContainsDisqualifyingPattern(title);

                    if (address && !containsDisqualifyingPattern && relevantDistrict) {
                        results.push({
                            address,
                            id: item?.getAttribute("id") || address,
                            title,
                            region: relevantDistrict?.district || item.querySelector(".angebot-region > td")?.innerHTML,
                            link: item
                                .querySelector(".angebot-footer")
                                ?.getElementsByTagName("a")[0]
                                .getAttribute("href"),
                            size: (item.querySelector(".angebot-area > td") as HTMLElement | undefined)?.innerText
                                ?.split("|")[1]
                                .trim(),
                            rooms: Number(
                                (item.querySelector(".angebot-area > td") as HTMLElement | undefined)?.innerText?.[0] ||
                                    0,
                            ),
                        });
                    }
                }),
            ));
        return { offers: results, isMultiPages };
    });
}

export const getGEWOBAGOffers = createScraper({
    providerName: "GEWOBAG",
    url: gewobagUrl,
    extractOffers: extractGewobagOffers,
});
