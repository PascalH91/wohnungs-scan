import { Offer } from "@/components/Provider";
import { getBrowser } from "./getBrowser";
import { generateRandomUA } from "./generateRandomUserAgents";
import { containsRelevantCityCode } from "./containsRelevantCityCodes";
import { titleContainsDisqualifyingPattern } from "./titleContainsDisqualifyingPattern";
import { transformSizeIntoValidNumber } from "./transformSizeIntoValidNumber";
import { maxColdRent, maxWarmRent, minRoomNumber, minRoomSize } from "./const";

export const howogeUrl = `https://www.howoge.de/immobiliensuche/wohnungssuche.html?tx_howsite_json_list%5Bpage%5D=1&tx_howsite_json_list%5Blimit%5D=12&tx_howsite_json_list%5Blang%5D=&tx_howsite_json_list%5Bkiez%5D%5B%5D=Friedrichshain-Kreuzberg&tx_howsite_json_list%5Bkiez%5D%5B%5D=Mitte&tx_howsite_json_list%5Bkiez%5D%5B%5D=Lichtenberg&tx_howsite_json_list%5Bkiez%5D%5B%5D=Treptow-K%C3%B6penick&tx_howsite_json_list%5Bkiez%5D%5B%5D=Charlottenburg-Wilmersdorf&tx_howsite_json_list%5Bkiez%5D%5B%5D=Neuk%C3%B6lln&tx_howsite_json_list%5Bkiez%5D%5B%5D=Pankow&tx_howsite_json_list%5Bkiez%5D%5B%5D=Tempelhof-Sch%C3%B6neberg&tx_howsite_json_list%5Brooms%5D=${minRoomSize}`;

export const getHOWOGEOffers = async () => {
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

        await page.goto(howogeUrl, { waitUntil: "networkidle2" });
        await page.waitForSelector(".flat-search", { visible: true });

        let data = await page.evaluate(async () => {
            let isMultiPages = false;
            let results: Offer[] = [];
            let items = document.querySelectorAll(".flat-single-grid-item");

            items &&
                (await Promise.all(
                    Array.from(items).map(async (item: Element) => {
                        const address = (item.querySelector(".address") as HTMLElement | undefined)?.innerText;
                        const title = (item.querySelector(".notice") as HTMLElement | undefined)?.innerText;
                        const relevantDistrict = await window.isInRelevantDistrict(address);
                        const containsDisqualifyingPattern = await window.containsDisqualifyingPattern(title);
                        const attributes = item.querySelectorAll(".attributes > div .attributes-content");
                        const isNewBuildingProject = attributes.length === 2;

                        const rooms = isNewBuildingProject
                            ? 0
                            : Number((attributes[2] as HTMLElement | undefined)?.innerText || 0);
                        const size = isNewBuildingProject ? "" : (attributes[1] as HTMLElement | undefined)?.innerText;
                        const transformedSize = (await window.transformSizeIntoValidNumber(size)) || 1000;

                        const minRoomNumber = await window.getMinRoomNumber();
                        const minRoomSize = await window.getMinRoomSize();

                        const showItem =
                            address &&
                            !containsDisqualifyingPattern &&
                            relevantDistrict &&
                            !isNewBuildingProject &&
                            rooms >= minRoomNumber &&
                            transformedSize >= minRoomSize;

                        if (showItem) {
                            results.push({
                                address,
                                id: item.getAttribute("data-uid") || address,
                                title,
                                region:
                                    relevantDistrict?.district || address.split(", ")[address.split(", ").length - 1],
                                link: `https://www.howoge.de${item?.getElementsByTagName("a")[0].getAttribute("href")}`,
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
        console.log("HOWOGE_ERROR", e);
        return { data: [], errors: e };
    }
};
