import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrower";
import { generateRandomUA } from "./generateRandomUserAgents";
import { containsRelevantCityCode } from "./containsRelevantCityCodes";
import { transformSizeIntoValidNumber } from "./transformSizeIntoValidNumber";

const deutscheWohnenUrl =
    "https://www.deutsche-wohnen.com/immobilienangebote#page=1&locale=de&commercializationType=rent&utilizationType=flat,retirement&location=10243&radius=10&area=60&rooms=2";

export const getDEUTSCHEWOHNENOffers = async () => {
    try {
        const browser = await getBrowser();

        const page = await browser.newPage();

        // Custom user agent from generateRandomUA() function
        const customUA = generateRandomUA();

        // Set custom user agent
        await page.setUserAgent(customUA);

        page.on("console", (msg) => console.log(msg.text()));
        await page.exposeFunction("isInRelevantDistrict", (cityCode: string) => containsRelevantCityCode(cityCode));
        await page.exposeFunction("transformSizeIntoValidNumber", (roomSize: string) =>
            transformSizeIntoValidNumber(roomSize),
        );
        await page.goto(deutscheWohnenUrl, { waitUntil: "networkidle2" });

        let data = await page.evaluate(async () => {
            let results: Offer[] = [];
            let items = document.querySelectorAll(".object-list__item");

            items &&
                (await Promise.all(
                    Array.from(items).map(async (item) => {
                        const title = item.querySelector("h2")?.innerText;
                        const address = item.querySelector(".object-list__address").innerText;
                        const relevantDistrict = await window.isInRelevantDistrict(address);

                        const specs = item.querySelector(".object-list__detail-items").innerText?.split("|");
                        const size = specs[0];
                        const transformedSize = await window.transformSizeIntoValidNumber(size);

                        const showItem = title && address && relevantDistrict && transformedSize > 65;

                        if (showItem) {
                            results.push({
                                id: item.getAttribute("id") || address,
                                address,
                                title,
                                region: relevantDistrict?.district,
                                link: `https://www.deutsche-wohnen.com${item?.getElementsByTagName("a")[0].getAttribute("href")}`,
                                size: specs[0],
                                rooms: specs[1],
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
