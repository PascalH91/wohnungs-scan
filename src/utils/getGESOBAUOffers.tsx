import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrowser";
import { generateRandomUA } from "./generateRandomUserAgents";
import { containsRelevantCityCode } from "./containsRelevantCityCodes";
import { titleContainsDisqualifyingPattern } from "./titleContainsDisqualifyingPattern";
import { maxColdRent, maxWarmRent, minRoomNumber, minRoomSize } from "./const";

export const gesobauUrl = `https://www.gesobau.de/mieten/wohnungssuche/?tx_solr[filter][]=zimmer:%27${minRoomNumber}-3%27&tx_solr[filter][]=wohnflaeche:%27${minRoomSize}-58%27&tx_solr[filter][]=warmmiete:%270-${maxWarmRent}%27`;

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
        const response = await page.goto(gesobauUrl, { waitUntil: "networkidle2" });
        if (response?.status() !== 200) {
            throw new Error(`${response?.status()} ${response?.statusText()}`);
        }

        await page.waitForSelector(".documentContent__content", {
            visible: true,
        });

        await page.exposeFunction("getMinRoomNumber", () => minRoomNumber);
        await page.exposeFunction("getMinRoomSize", () => minRoomSize);
        await page.exposeFunction("getMaxColdRent", () => maxColdRent);
        await page.exposeFunction("getMaxWarmRent", () => maxWarmRent);

        let data = await page.evaluate(async () => {
            const isMultiPages = Array.from(document.querySelectorAll(".pagination li")).length > 1;
            let results: Offer[] = [];
            let items = document.querySelectorAll(".results-list .basicTeaser__wrapper");

            items &&
                (await Promise.all(
                    Array.from(items).map(async (item) => {
                        const address = (item.querySelector(".basicTeaser__text > span") as HTMLElement | undefined)
                            ?.innerText;
                        const relevantDistrict = await window.isInRelevantDistrict(address);

                        const title = (item.querySelector(".basicTeaser__title") as HTMLElement | undefined)?.innerText;
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
            return { offers: results, isMultiPages };
        });
        browser.close();
        return { data, errors: "" };
    } catch (e: any) {
        console.log("e =>", e);
        return { data: [], errors: e.message };
    }
};
