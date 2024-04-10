import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrower";
import { generateRandomUA } from "./generateRandomUserAgents";
import { containsRelevantCityCode } from "./containsRelevantCityCodes";
import { titleContainsDisqualifyingPattern } from "./titleContainsDisqualifyingPattern";

const gesobauUrl =
    "https://www.gesobau.de/mieten/wohnungssuche/?tx_solr[filter][]=zimmer:%272-3%27&tx_solr[filter][]=wohnflaeche:%2768-58%27";

export const getGESOBAUOffers = async () => {
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
        await page.goto(gesobauUrl, { waitUntil: "networkidle2" });

        let data = await page.evaluate(async () => {
            let results: Offer[] = [];
            let items = document.querySelectorAll(".basicTeaser__wrapper");

            items &&
                (await Promise.all(
                    Array.from(items).map(async (item) => {
                        const address = item.querySelector(".basicTeaser__text > span")?.innerText;
                        const relevantDistrict = await window.isInRelevantDistrict(address);

                        const title = item.querySelector(".basicTeaser__title")?.innerText;
                        const containsDisqualifyingPattern = await window.containsDisqualifyingPattern(title);
                        const attributes = item.querySelectorAll(".apartment__info > span");

                        const link = item
                            .querySelector(".basicTeaser__title")
                            ?.getElementsByTagName("a")[0]
                            .getAttribute("href");

                        const showItem = address && !containsDisqualifyingPattern && relevantDistrict && link;

                        if (showItem) {
                            results.push({
                                address,
                                id: item.getAttribute("id") || link,
                                title,
                                region: relevantDistrict?.district || "-",
                                link: item
                                    .querySelector(".basicTeaser__title")
                                    ?.getElementsByTagName("a")[0]
                                    .getAttribute("href"),
                                size: attributes[1]?.innerHTML,
                                rooms: +attributes[0]?.innerHTML.trim()[0],
                            });
                        }
                    }),
                ));
            return results;
        });
        browser.close();
        return { data, errors: "" };
    } catch (e: any) {
        console.log(e);
        return { data: [], errors: e };
    }
};
