import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrowser";
import { generateRandomUA } from "./generateRandomUserAgents";
import { titleContainsDisqualifyingPattern } from "./titleContainsDisqualifyingPattern";
import { containsRelevantCityCode } from "./containsRelevantCityCodes";
import { transformSizeIntoValidNumber } from "./transformSizeIntoValidNumber";

const neuesBerlinUrl = "https://www.neues-berlin.de/wohnen/wohnungsangebote";

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

        await page.goto(neuesBerlinUrl, { waitUntil: "networkidle2" });

        let data = await page.evaluate(async () => {
            let results: Offer[] = [];

            let items = document.querySelectorAll(".frame-type-nbtheme_openimmo");

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
                        const transformedRooms = (await window.transformSizeIntoValidNumber(rooms)) || 0;
                        const size = (specs[2] as HTMLElement | undefined)?.innerText;
                        const transformedSize = (await window.transformSizeIntoValidNumber(size)) || 0;

                        const showItem = address && relevantDistrict && transformedRooms !== 1 && transformedSize > 68;

                        if (showItem) {
                            results.push({
                                address,
                                id: item.getAttribute("data-uid") || address,
                                title,
                                region:
                                    relevantDistrict?.district || address.split(", ")[address.split(", ").length - 1],
                                link: `https://www.neues-berlin.de/wohnen/wohnungsangebote`,
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
        console.log("e =>", e);
        return { data: [], errors: e };
    }
};
