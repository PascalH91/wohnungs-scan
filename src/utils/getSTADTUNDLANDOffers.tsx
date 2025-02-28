import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrowser";
import { generateRandomUA } from "./generateRandomUserAgents";
import { containsRelevantCityCode } from "./containsRelevantCityCodes";
import { titleContainsDisqualifyingPattern } from "./titleContainsDisqualifyingPattern";
import { maxColdRent, maxWarmRent, minRoomNumber, minRoomSize } from "./const";

export const stadtUndLandUrl = `https://www.stadtundland.de/immobiliensuche.php?form=stadtundland-expose-search-1.form&sp%3Acategories%5B3352%5D%5B%5D=-&sp%3Acategories%5B3352%5D%5B%5D=__last__&sp%3AroomsFrom%5B%5D=${minRoomNumber}&sp%3AroomsTo%5B%5D=&sp%3ArentPriceFrom%5B%5D=&sp%3ArentPriceTo%5B%5D=&sp%3AareaFrom%5B%5D=${minRoomSize}&sp%3AareaTo%5B%5D=&sp%3Afeature%5B%5D=__last__&action=submit`;

export const getSTADTUNDLANDOffers = async () => {
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

        await page.exposeFunction("getMinRoomNumber", () => minRoomNumber);
        await page.exposeFunction("getMinRoomSize", () => minRoomSize);
        await page.exposeFunction("getMaxColdRent", () => maxColdRent);
        await page.exposeFunction("getMaxWarmRent", () => maxWarmRent);

       const response = await page.goto(stadtUndLandUrl, { waitUntil: "networkidle2" });
       if (response?.status() !== 200) {
           throw new Error(`${response?.status()} ${response?.statusText()}`);
       }

        let data = await page.evaluate(async () => {
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

                        const containsDisqualifyingPattern = await window.containsDisqualifyingPattern(title);

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
        browser.close();
        return { data, errors: "" };
    } catch (e: any) {
        console.log("e =>", e);
        return { data: [], errors: e.message };
    }
};
