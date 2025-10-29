import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrowser";
import { generateRandomUA } from "./generateRandomUserAgents";
import { titleContainsDisqualifyingPattern } from "./titleContainsDisqualifyingPattern";
import { containsRelevantCityCode } from "./containsRelevantCityCodes";
import { transformSizeIntoValidNumber } from "./transformSizeIntoValidNumber";
import { maxColdRent, maxWarmRent, minRoomNumber, minRoomSize } from "./const";

export const neuesBerlinUrl = "https://www.neues-berlin.de/wohnen/wohnungsangebote";

export const getNeuesBerlinOffers = async () => {
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

        const response = await page.goto(neuesBerlinUrl, { waitUntil: "networkidle2" });
        if (response?.status() !== 200) {
            throw new Error(`${response?.status()} ${response?.statusText()}`);
        }

        let data = await page.evaluate(async () => {
            let isMultiPages = false;
            let results: Offer[] = [];

            let items = document.querySelectorAll(".frame-type-list");

            items &&
                (await Promise.all(
                    Array.from(items).map(async (item: Element) => {
                        if (
                            (item as HTMLElement).innerText ===
                            "Derzeit verfügen wir über keine aktuellen Wohnungsangebote."
                        ) {
                            return;
                        }

                        const title = (item.querySelector("h2") as HTMLElement | undefined)?.innerText;
                        const specs = item.querySelectorAll(".row > div");
                        const address = (specs[0] as HTMLElement | undefined)?.innerText;
                        const relevantDistrict = await window.isInRelevantDistrict(address);
                        const rooms = (specs[1] as HTMLElement | undefined)?.innerText.split(" ")[0];
                        const transformedRooms = (await window.transformSizeIntoValidNumber(rooms)) || 100;
                        const size = (specs[2] as HTMLElement | undefined)?.innerText;
                        const transformedSize = (await window.transformSizeIntoValidNumber(size)) || 1000;

                        const minRoomNumber = await window.getMinRoomNumber();
                        const minRoomSize = await window.getMinRoomSize();

                        const showItem =
                            address &&
                            relevantDistrict &&
                            transformedRooms >= minRoomNumber &&
                            transformedSize >= minRoomSize;

                        if (showItem) {
                            results.push({
                                address,
                                id: item.getAttribute("data-uid") || address,
                                title,
                                region:
                                    relevantDistrict?.district || address.split(", ")[address.split(", ").length - 1],
                                link:
                                    `https://www.neues-berlin.de` +
                                    item
                                        .querySelector(".oi-wa-info")
                                        ?.getElementsByTagName("a")[0]
                                        .getAttribute("href"),
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
