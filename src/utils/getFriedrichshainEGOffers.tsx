import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrowser";
import { generateRandomUA } from "./generateRandomUserAgents";
import { containsRelevantCityCode } from "./containsRelevantCityCodes";
import { transformSizeIntoValidNumber } from "./transformSizeIntoValidNumber";
import { maxColdRent, maxWarmRent, minRoomNumber, minRoomSize } from "./const";

export const FriedrichshainEGUrl = "https://www.wbg-friedrichshain-eg.de/wohnungssuche/wohnungsangebote";

export const getFriedrichshainEGOffers = async () => {
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

        const response = await page.goto(FriedrichshainEGUrl, { waitUntil: "networkidle2" });
        if (response?.status() !== 200) {
            throw new Error(`${response?.status()} ${response?.statusText()}`);
        }

        let data = await page.evaluate(async () => {
            let isMultiPages = false;
            let results: Offer[] = [];

            let items = document.querySelectorAll(".jea_item");
            items &&
                (await Promise.all(
                    Array.from(items).map(async (item) => {
                        const itemInnerText = (item as HTMLElement).innerText;
                        const title = item.querySelector("h3")?.innerText;
                        const address = (item.querySelector("p") as HTMLElement | undefined)?.innerText;

                        const relevantDistrict = await window.isInRelevantDistrict(address);
                        const isWBS = itemInnerText.includes("- WBS erforderlich");
                        const roomNumber = itemInnerText.split("Zimmer:")[1][1];
                        const transformedRoomNumber = (await window.transformSizeIntoValidNumber(roomNumber)) || 0;

                        const roomSize = itemInnerText.split("Größe:")[1].slice(0, 5);
                        const transformedSize = (await window.transformSizeIntoValidNumber(roomSize)) || 0;

                        const minRoomNumber = await window.getMinRoomNumber();
                        const minRoomSize = await window.getMinRoomSize();

                        const showItem =
                            title &&
                            address &&
                            !isWBS &&
                            relevantDistrict &&
                            transformedRoomNumber >= minRoomNumber &&
                            transformedSize >= minRoomSize;

                        if (showItem) {
                            results.push({
                                address,
                                id: `${title.split(" ").join("_")}_${address.split(" ").join("_")}`,
                                title: title,
                                region: relevantDistrict?.district,
                                link: `https://www.wbg-friedrichshain-eg.de${item.querySelector(".jea-list-text")?.getElementsByTagName("a")[0].getAttribute("href")}`,
                                size: roomSize,
                                rooms: roomNumber,
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
