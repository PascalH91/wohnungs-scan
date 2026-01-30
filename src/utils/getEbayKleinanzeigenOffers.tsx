import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { titleContainsDisqualifyingPatternExtended } from "./titleContainsDisqualifyingPattern_extended";
import { ebayKleinanzeigenUrl } from "./providerUrls";

const { minRoomSize, minRoomNumber, maxColdRent, maxWarmRent } = config.apartment;

async function extractEbayKleinanzeigenOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    await page.exposeFunction("containsDisqualifyingPatternExtended", (title: string) =>
        titleContainsDisqualifyingPatternExtended(title),
    );

    return await page.evaluate(async () => {
        const isMultiPages = Array.from(document.querySelectorAll(".pagination span")).length > 1;
        let results: Offer[] = [];
        let items = document.querySelectorAll(".fully-clickable-card");

        items &&
            (await Promise.all(
                Array.from(items).map(async (item) => {
                    const address = (item.querySelector(".aditem-main--top--left") as HTMLElement)?.innerText;
                    const relevantDistrict = await window.isInRelevantDistrict(address);
                    const title = item.querySelector("h2")?.innerText ?? "";
                    const containsDisqualifyingPattern = await window.titleContainsDisqualifyingPattern(title);
                    const containsDisqualifyingPatternExtended =
                        await window.containsDisqualifyingPatternExtended(title);

                    const attributes = (
                        item.querySelector(".aditem-main--middle--tags") as HTMLElement
                    ).innerText.split(" · ");

                    const transformedRooms =
                        (await window.transformSizeIntoValidNumber(attributes[1].split(" ")[0])) || 100;
                    const transformedSize =
                        (await window.transformSizeIntoValidNumber(attributes[0].split(" ")[0])) || 100;

                    if (
                        address &&
                        !containsDisqualifyingPattern &&
                        !containsDisqualifyingPatternExtended &&
                        relevantDistrict
                    ) {
                        results.push({
                            address,
                            id: item.getAttribute("data-adid") || address,
                            title,
                            region: relevantDistrict?.district || item.querySelector(".angebot-region > td")?.innerHTML,
                            link: `https://www.kleinanzeigen.de${item.querySelector("h2")?.getElementsByTagName("a")[0].getAttribute("href")}`,
                            size: transformedSize.toString(),
                            rooms: transformedRooms,
                        });
                    }
                }),
            ));
        return { offers: results, isMultiPages };
    });
}

export const getEbayKleinanzeigenOffers = createScraper({
    providerName: "Ebay Kleinanzeigen",
    url: ebayKleinanzeigenUrl,
    extractOffers: extractEbayKleinanzeigenOffers,
});
