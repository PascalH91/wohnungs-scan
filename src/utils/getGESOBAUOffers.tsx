import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { gesobauUrl } from "./providerUrls";

const { minRoomSize, minRoomNumber, maxColdRent, maxWarmRent } = config.apartment;

async function extractGESOBAUOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    return await page.evaluate(async () => {
        const isMultiPages = Array.from(document.querySelectorAll(".pagination li")).length > 1;
        let results: Offer[] = [];
        let items = document.querySelectorAll(".basicTeaser__content");

        items &&
            (await Promise.all(
                Array.from(items).map(async (item) => {
                    const address = (item.querySelector(".basicTeaser__text > span") as HTMLElement | undefined)
                        ?.innerText;

                    const relevantDistrict = await window.isInRelevantDistrict(address);

                    const title = (item.querySelector(".basicTeaser__title") as HTMLElement | null)?.innerText ?? "";
                    const containsDisqualifyingPattern = await window.titleContainsDisqualifyingPattern(title);

                    // Each `.apartment__info > span` now holds an SVG icon plus text, in
                    // the order price / rooms / size — so read innerText (not innerHTML,
                    // which is the icon markup) and pick by content rather than index.
                    const attributeTexts = Array.from(item.querySelectorAll(".apartment__info > span")).map(
                        (span) => (span as HTMLElement).innerText.trim(),
                    );
                    const roomsText = attributeTexts.find((t) => /zimmer/i.test(t));
                    const sizeText = attributeTexts.find((t) => /m²/i.test(t));

                    const link = item
                        .querySelector(".basicTeaser__title")
                        ?.getElementsByTagName("a")[0]
                        .getAttribute("href");

                    const showItem = !!(address && !containsDisqualifyingPattern && relevantDistrict && link);

                    if (showItem) {
                        results.push({
                            address,
                            id: item.getAttribute("id") || link,
                            title,
                            region: relevantDistrict?.district || "-",
                            link:
                                "https://www.gesobau.de" +
                                item
                                    .querySelector(".basicTeaser__title")
                                    ?.getElementsByTagName("a")[0]
                                    .getAttribute("href"),
                            size: sizeText,
                            rooms: roomsText ? parseFloat(roomsText.replace(",", ".")) : undefined,
                        });
                    }
                }),
            ));
        return { offers: results, isMultiPages };
    });
}

export const getGESOBAUOffers = createScraper({
    providerName: "GESOBAU",
    url: gesobauUrl,
    waitForSelector: ".documentContent__content",
    extractOffers: extractGESOBAUOffers,
});
