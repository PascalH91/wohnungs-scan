import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrower";
import { generateRandomUA } from "./generateRandomUserAgents";
import { containsRelevantCityCode } from "./containsRelevantCityCodes";
import { titleContainsDisqualifyingPattern } from "./titleContainsDisqualifyingPattern";
import { transformSizeIntoValidNumber } from "./transformSizeIntoValidNumber";

const dpfUrl = "https://www.dpfonline.de/interessenten/immobilien/";

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

        await page.goto(dpfUrl, { waitUntil: "networkidle2" });

        let data = await page.evaluate(async () => {
            let results: Offer[] = [];

            let items = document.querySelectorAll(".immo-a-info");

            items &&
                (await Promise.all(
                    Array.from(items).map(async (item) => {
                        const title = item.querySelector("h3")?.innerText;
                        const address = item.querySelector(".trenner li")?.innerText;
                        const link = item.querySelector("h3")?.getElementsByTagName("a")[0].getAttribute("href");
                        const relevantDistrict = await window.isInRelevantDistrict(address);

                        const attributes = item.querySelectorAll(".immo-data");

                        const size = attributes[1].innerText.trim();
                        const transformedSize = await window.transformSizeIntoValidNumber(size);
                        const rooms = attributes[2].innerText.trim();
                        const transformedRooms = await window.transformSizeIntoValidNumber(rooms);

                        const showItem =
                            address && transformedSize > 68 && transformedRooms !== 1 && relevantDistrict && link;

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
            return results;
        });

        browser.close();
        return { data, errors: "" };
    } catch (e: any) {
        console.log(e);
        return { data: [], errors: e };
    }
};
