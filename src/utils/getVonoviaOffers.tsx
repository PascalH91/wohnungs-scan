import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { transformPrice } from "./transformPrice";
import { vonoviaUrl } from "./providerUrls";

const { minRoomSize, minRoomNumber, maxColdRent, maxWarmRent } = config.apartment;

async function extractVonoviaOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    await page.exposeFunction("transformPriceIntoValidNumber", (price: string) => transformPrice(price));

    return await page.evaluate(async () => {
        let isMultiPages = false;
        let results: Offer[] = [];

        let items = document.querySelectorAll(".teasers .item");

        items &&
            (await Promise.all(
                Array.from(items).map(async (item) => {
                    const address = (item.querySelector(".rte") as HTMLElement | undefined)?.innerText;
                    console.log(address);
                    const relevantDistrict = await window.isInRelevantDistrict(address);
                    const title = item.querySelector("h2")?.innerText ?? "";
                    const containsDisqualifyingPattern = await window.titleContainsDisqualifyingPattern(title);
                    const price = (item.querySelector(".price") as HTMLElement | undefined)?.innerText;
                    const transformedPrice = (await window.transformPriceIntoValidNumber(price)) || 0;

                    const maxWarmRent = await window.getMaxWarmRent();

                    if (
                        address &&
                        !containsDisqualifyingPattern &&
                        !!relevantDistrict &&
                        transformedPrice <= maxWarmRent
                    ) {
                        results.push({
                            address,
                            id: item.getAttribute("id") || address,
                            title,
                            region: relevantDistrict?.district || "-",
                            link: `https://www.vonovia.de${item.querySelector(".links")?.getElementsByTagName("a")[0].getAttribute("href")}`,
                            size: (item.querySelectorAll(".features-wrap .badge")[0] as HTMLElement | undefined)
                                ?.innerText,
                            rooms: Number(
                                (item.querySelectorAll(".features-wrap .badge")[1] as HTMLElement | undefined)
                                    ?.innerText[0],
                            ),
                        });
                    }
                }),
            ));
        return { offers: results, isMultiPages };
    });
}

export const getVonoviaOffers = createScraper({
    providerName: "Vonovia",
    url: vonoviaUrl,
    waitForSelector: ".teasers",
    extractOffers: extractVonoviaOffers,
});
