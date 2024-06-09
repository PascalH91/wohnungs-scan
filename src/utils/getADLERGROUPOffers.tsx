import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrowser";
import { generateRandomUA } from "./generateRandomUserAgents";
import { containsRelevantCityCode } from "./containsRelevantCityCodes";
import { titleContainsDisqualifyingPattern } from "./titleContainsDisqualifyingPattern";
import { transformSizeIntoValidNumber } from "./transformSizeIntoValidNumber";
import { maxColdRent, maxWarmRent, minRoomNumber, minRoomSize } from "./const";

export const adlergroupUrl = `https://www.adler-group.com/suche/wohnung?geocodes=1276003001&livingspace=${minRoomSize}&numberofrooms=${minRoomNumber}-4&page=1&price=${maxWarmRent}&sortby=price`;

export const getADLERGROUPOffers = async () => {
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
        await page.exposeFunction("transformSizeIntoValidNumber", (roomSize: string) =>
            transformSizeIntoValidNumber(roomSize),
        );

        await page.exposeFunction("getMinRoomNumber", () => minRoomNumber);
        await page.exposeFunction("getMinRoomSize", () => minRoomSize);
        await page.exposeFunction("getMaxColdRent", () => maxColdRent);
        await page.exposeFunction("getMaxWarmRent", () => maxWarmRent);

        await page.goto(adlergroupUrl, { waitUntil: "networkidle2" });

        let data = await page.evaluate(async () => {
            let isMultiPages = false;
            let results: Offer[] = [];
            let items = document.querySelectorAll("#search-results .row > div");

            items &&
                (await Promise.all(
                    Array.from(items).map(async (item) => {
                        const infos = item.querySelectorAll("td");
                        const infoMap = Array.from(infos).map((a) => a.innerText);
                        const address = `${infoMap[0]}, ${infoMap[2]}`;
                        const relevantDistrict = await window.isInRelevantDistrict(address);
                        const title = (item.querySelector(".object-headline") as HTMLElement | undefined)?.innerText;
                        const containsDisqualifyingPattern = await window.containsDisqualifyingPattern(title);

                        if (address && !containsDisqualifyingPattern && relevantDistrict) {
                            results.push({
                                address,
                                id: item?.getAttribute("data-object-id") || address,
                                title,
                                region: relevantDistrict?.district || "",
                                link: item
                                    .querySelector(".object-headline")
                                    ?.getElementsByTagName("a")[0]
                                    .getAttribute("href"),
                                size: infoMap[1].split(" ")[0],
                                rooms: infoMap[3].split(" ")[0],
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
        return { data: [], errors: e.toString() };
    }
};
