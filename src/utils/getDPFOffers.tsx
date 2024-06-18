import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrowser";
import { generateRandomUA } from "./generateRandomUserAgents";
import { containsRelevantCityCode } from "./containsRelevantCityCodes";
import { titleContainsDisqualifyingPattern } from "./titleContainsDisqualifyingPattern";
import { transformSizeIntoValidNumber } from "./transformSizeIntoValidNumber";
import { maxColdRent, maxWarmRent, minRoomNumber, minRoomSize } from "./const";
import { transformPrice } from "./transformPrice";

export const dpfUrl = "https://www.dpfonline.de/interessenten/angebote/";

export const getDPFOffers = async () => {
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
        await page.exposeFunction("transformPriceIntoValidNumber", (price: string) => transformPrice(price));

        await page.exposeFunction("getMinRoomNumber", () => minRoomNumber);
        await page.exposeFunction("getMinRoomSize", () => minRoomSize);
        await page.exposeFunction("getMaxColdRent", () => maxColdRent);
        await page.exposeFunction("getMaxWarmRent", () => maxWarmRent);

        const response = await page.goto(dpfUrl, { waitUntil: "networkidle2" });
        if (response?.status() !== 200) {
            throw new Error(`${response?.status()} ${response?.statusText()}`);
        }

        let data = await page.evaluate(async () => {
            let isMultiPages = false;
            let results: Offer[] = [];

            let items = document.querySelectorAll(".immo-a-info");

            items &&
                (await Promise.all(
                    Array.from(items).map(async (item) => {
                        const title = item.querySelector("h3")?.innerText;
                        const address = (item.querySelector(".trenner li") as HTMLElement | undefined)?.innerText;
                        const link = item.querySelector("h3")?.getElementsByTagName("a")[0].getAttribute("href");
                        const relevantDistrict = await window.isInRelevantDistrict(address);

                        const attributes = item.querySelectorAll(".immo-data");

                        const size = (attributes[1] as HTMLElement | undefined)?.innerText.trim();
                        const transformedSize = (await window.transformSizeIntoValidNumber(size)) || 1000;
                        const rooms = (attributes[2] as HTMLElement | undefined)?.innerText.trim();
                        const transformedRooms = (await window.transformSizeIntoValidNumber(rooms)) || 100;
                        const price = (attributes[0] as HTMLElement | undefined)?.innerText.trim();
                        const transformedColdPrice = (await window.transformPriceIntoValidNumber(price)) || 0;

                        const minRoomNumber = await window.getMinRoomNumber();
                        const minRoomSize = await window.getMinRoomSize();
                        const maxColdRent = await window.getMaxColdRent();

                        const showItem =
                            address &&
                            transformedSize >= minRoomSize &&
                            transformedRooms >= minRoomNumber &&
                            transformedColdPrice <= maxColdRent &&
                            relevantDistrict &&
                            link;

                        if (showItem) {
                            results.push({
                                address,
                                id: link,
                                title,
                                region: relevantDistrict?.district || "-",
                                link,
                                size,
                                rooms,
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
