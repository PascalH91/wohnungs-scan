import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrowser";
import { generateRandomUA } from "./generateRandomUserAgents";
import { containsRelevantCityCode } from "./containsRelevantCityCodes";
import { transformSizeIntoValidNumber } from "./transformSizeIntoValidNumber";
import { maxColdRent, maxWarmRent, minRoomNumber, minRoomSize } from "./const";

export const wbmUrl = "https://www.wbm.de/wohnungen-berlin/angebote/";

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
        await page.exposeFunction("getMinRoomNumber", () => minRoomNumber);
        await page.exposeFunction("getMinRoomSize", () => minRoomSize);
        await page.exposeFunction("getMaxColdRent", () => maxColdRent);
        await page.exposeFunction("getMaxWarmRent", () => maxWarmRent);

        const response = await page.goto(wbmUrl, { waitUntil: "networkidle2" });
        if (response?.status() !== 200) {
            throw new Error(`${response?.status()} ${response?.statusText()}`);
        }

        let data = await page.evaluate(async () => {
            console.log(JSON.stringify(document, null, 2));
            const isMultiPages = Array.from(document.querySelectorAll(".pagination li")).length > 3;

            let results: Offer[] = [];
            let items = document.querySelectorAll(".openimmo-search-list-item");

            items &&
                (await Promise.all(
                    Array.from(items).map(async (item) => {
                        const title = item.querySelector("h2");
                        const address = (item.querySelector(".address") as HTMLElement | undefined)?.innerText;
                        const relevantDistrict = await window.isInRelevantDistrict(address);
                        const propertylist = item.getElementsByTagName("li");
                        const isWBS = Array.from(propertylist).some((prop) => prop.innerText === "WBS");
                        const roomSize = (item.querySelector(".main-property-size") as HTMLElement | undefined)
                            ?.innerText;
                        const transformedSize = (await window.transformSizeIntoValidNumber(roomSize)) || 0;
                        const roomNumber = Number(
                            (item.querySelector(".main-property-rooms") as HTMLElement | undefined)?.innerText,
                        );

                        const minRoomNumber = await window.getMinRoomNumber();
                        const minRoomSize = await window.getMinRoomSize();

                        const showItem =
                            title &&
                            address &&
                            !isWBS &&
                            relevantDistrict &&
                            roomNumber >= minRoomNumber &&
                            transformedSize >= minRoomSize;

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

            return { offers: results, isMultiPages };
        });
        browser.close();
        return { data, errors: undefined };
    } catch (e: any) {
        console.log("e =>", e);
        return { data: [], errors: e.message };
    }
};
