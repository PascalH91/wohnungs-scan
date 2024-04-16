import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrowser";
import { generateRandomUA } from "./generateRandomUserAgents";
import { containsRelevantCityCode } from "./containsRelevantCityCodes";
import { transformSizeIntoValidNumber } from "./transformSizeIntoValidNumber";

const wbmUrl = "https://www.wbm.de/wohnungen-berlin/angebote/";

export const getWBMOffers = async () => {
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
        await page.goto(wbmUrl, { waitUntil: "networkidle2" });

        let data = await page.evaluate(async () => {
            let results: Offer[] = [];
            let items = document.querySelectorAll(".openimmo-search-list-item");

            items &&
                (await Promise.all(
                    Array.from(items).map(async (item) => {
                        const title = item.querySelector("h2");
                        const address = item.querySelector(".address")?.innerText;
                        const relevantDistrict = await window.isInRelevantDistrict(address);
                        const propertylist = item.getElementsByTagName("li");
                        const isWBS = Array.from(propertylist).some((prop) => prop.innerText === "WBS");
                        const roomSize = item.querySelector(".main-property-size")?.innerText;
                        const transformedSize = await window.transformSizeIntoValidNumber(roomSize);
                        const roomNumber = +item.querySelector(".main-property-rooms")?.innerText;

                        const showItem =
                            title && address && !isWBS && relevantDistrict && roomNumber !== 1 && transformedSize > 65;

                        if (showItem) {
                            results.push({
                                address,
                                id: `${item.getAttribute("data-id")}_${item.getAttribute("data-uid")}`,
                                title: title?.innerHTML,
                                region: relevantDistrict?.district || item.querySelector(".area")?.innerHTML,
                                link: `https://www.wbm.de${item.querySelector(".btn-holder")?.getElementsByTagName("a")[0].getAttribute("href")}`,
                                size: roomSize,
                                rooms: roomNumber,
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
