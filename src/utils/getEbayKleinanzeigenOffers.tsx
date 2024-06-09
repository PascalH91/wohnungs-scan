import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrowser";
import { generateRandomUA } from "./generateRandomUserAgents";
import { containsRelevantCityCode } from "./containsRelevantCityCodes";
import { titleContainsDisqualifyingPattern } from "./titleContainsDisqualifyingPattern";
import { titleContainsDisqualifyingPatternExtended } from "./titleContainsDisqualifyingPattern_extended";

export const ebayKleinanzeigenUrl =
    "https://www.kleinanzeigen.de/s-wohnung-mieten/friedrichshain-kreuzberg/anzeige:angebote/preis:700:1400/c203l26918r5+wohnung_mieten.qm_d:68%2C+wohnung_mieten.swap_s:nein+wohnung_mieten.zimmer_d:2%2C";

export const getEbayKleinanzeigenOffers = async () => {
    try {
        const browser = await getBrowser();

        const page = await browser.newPage();

        // Custom user agent from generateRandomUA() function
        const customUA = generateRandomUA();

        // Set custom user agent
        await page.setUserAgent(customUA);

        page.on("console", (msg) => console.log(msg.text()));

        await page.exposeFunction("isInRelevantDistrict", (cityCode: string) => containsRelevantCityCode(cityCode));
        await page.exposeFunction("containsDisqualifyingPattern", (title: string) =>
            titleContainsDisqualifyingPattern(title),
        );
        await page.exposeFunction("containsDisqualifyingPatternExtended", (title: string) =>
            titleContainsDisqualifyingPatternExtended(title),
        );

        await page.goto(ebayKleinanzeigenUrl, { waitUntil: "networkidle2" });

        let data = await page.evaluate(async () => {
            let isMultiPages = false;
            let results: Offer[] = [];
            let items = document.querySelectorAll("div.position-relative > ul.itemlist article");

            items &&
                (await Promise.all(
                    Array.from(items).map(async (item) => {
                        const address = (item.querySelector(".aditem-main--top--left") as HTMLElement)?.innerText;
                        const relevantDistrict = await window.isInRelevantDistrict(address);
                        const title = item.querySelector("h2")?.innerText;
                        const containsDisqualifyingPattern = await window.containsDisqualifyingPattern(title);
                        const containsDisqualifyingPatternExtended =
                            await window.containsDisqualifyingPatternExtended(title);

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
                                region:
                                    relevantDistrict?.district || item.querySelector(".angebot-region > td")?.innerHTML,
                                link: `https://www.kleinanzeigen.de${item.querySelector("h2")?.getElementsByTagName("a")[0].getAttribute("href")}`,
                                size: (item.querySelectorAll(".simpletag")[0] as HTMLElement | undefined)?.innerText,
                                rooms: Number(
                                    (
                                        item.querySelectorAll(".simpletag")[1] as HTMLElement | undefined
                                    )?.innerText?.split(" ")[0] || 0,
                                ),
                            });
                        }
                    }),
                ));
            return { offers: results, isMultiPages };
        });
        browser.close();
        return { data, errors: "" };
    } catch (e: any) {
        console.log("e =>", e);
        return { data: [], errors: e };
    }
};
