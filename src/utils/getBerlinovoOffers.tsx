import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrowser";
import { generateRandomUA } from "./generateRandomUserAgents";
import { containsRelevantCityCode } from "./containsRelevantCityCodes";
import { titleContainsDisqualifyingPattern } from "./titleContainsDisqualifyingPattern";
import { transformSizeIntoValidNumber } from "./transformSizeIntoValidNumber";
import { maxColdRent, maxWarmRent, minRoomNumber, minRoomSize } from "./const";

export const berlinovoUrl = `https://www.berlinovo.de/de/wohnungen/suche?w%5B0%5D=wohnungen_wohnflaeche%3A%28min%3A${minRoomSize}%2Cmax%3A105%2Call_min%3A${minRoomSize}%2Call_max%3A105%29&w%5B1%5D=wohungen_region%3A6`;

export const getBerlinovoOffers = async () => {
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

        const response = await page.goto(berlinovoUrl, { waitUntil: "networkidle2" });
        if (response?.status() !== 200) {
            throw new Error(`${response?.status()} ${response?.statusText()}`);
        }

        let data = await page.evaluate(async () => {
            let isMultiPages = false;
            let results: Offer[] = [];
            let items = document.querySelectorAll(".view-content article");

            items &&
                (await Promise.all(
                    Array.from(items).map(async (item) => {
                        const address = (item.querySelector(".features")?.firstElementChild as HTMLElement | undefined)
                            ?.innerText;

                        const relevantDistrict = await window.isInRelevantDistrict(address);
                        const title = (item.querySelector(".field--name-title") as HTMLElement | undefined)?.innerText;
                        const containsDisqualifyingPattern = await window.containsDisqualifyingPattern(title);

                        const rooms = (
                            item.querySelector(".block-field-blocknodeapartmentfield-rooms") as HTMLElement | undefined
                        )?.innerText.split(" ")[1];

                        const transformedRooms = (await window.transformSizeIntoValidNumber(rooms)) || 100;

                        const minRoomNumber = await window.getMinRoomNumber();

                        if (
                            address &&
                            !containsDisqualifyingPattern &&
                            relevantDistrict &&
                            transformedRooms >= minRoomNumber
                        ) {
                            results.push({
                                address,
                                id: item?.getAttribute("data-history-node-id") || address,
                                title,
                                region: relevantDistrict?.district || "",
                                link:
                                    "https://www.berlinovo.de/" +
                                    item
                                        .querySelector(".title .field")
                                        ?.getElementsByTagName("a")[0]
                                        .getAttribute("href"),
                                size: "> 67m²",
                                rooms: transformedRooms,
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
