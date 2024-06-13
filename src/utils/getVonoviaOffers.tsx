import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrowser";
import { generateRandomUA } from "./generateRandomUserAgents";
import { containsRelevantCityCode } from "./containsRelevantCityCodes";
import { titleContainsDisqualifyingPattern } from "./titleContainsDisqualifyingPattern";
import { transformPrice } from "./transformPrice";
import { maxColdRent, maxWarmRent, minRoomNumber, minRoomSize } from "./const";

export const vonoviaUrl = `https://www.vonovia.de/zuhause-finden/immobilien?rentType=miete&city=Berlin&lift=0&parking=0&cellar=0&immoType=wohnung&priceMax=${maxWarmRent}&sizeMin=${minRoomSize}&minRooms=${minRoomNumber}&floor=Beliebig&bathtub=0&bathwindow=0&bathshower=0&furnished=0&kitchenEBK=0&toiletSeparate=0&disabilityAccess=egal&seniorFriendly=0&balcony=egal&garden=0&subsidizedHousingPermit=egal&scroll=true`;

export const getVonoviaOffers = async () => {
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
        await page.exposeFunction("transformPriceIntoValidNumber", (price: string) => transformPrice(price));

        await page.exposeFunction("getMinRoomNumber", () => minRoomNumber);
        await page.exposeFunction("getMinRoomSize", () => minRoomSize);
        await page.exposeFunction("getMaxColdRent", () => maxColdRent);
        await page.exposeFunction("getMaxWarmRent", () => maxWarmRent);

       const response = await page.goto(vonoviaUrl, { waitUntil: "networkidle2" });
       if (response?.status() !== 200) {
           throw new Error(`${response?.status()} ${response?.statusText()}`);
       }

        let data = await page.evaluate(async () => {
            let isMultiPages = false;
            let results: Offer[] = [];
            let items = document.querySelectorAll(".teasers .content-card");

            items &&
                (await Promise.all(
                    Array.from(items).map(async (item) => {
                        const address = (item.querySelector(".rte") as HTMLElement | undefined)?.innerText;
                        const relevantDistrict = await window.isInRelevantDistrict(address);
                        const title = item.querySelector("h2")?.innerText;
                        const containsDisqualifyingPattern = await window.containsDisqualifyingPattern(title);
                        const price = (item.querySelector(".price") as HTMLElement | undefined)?.innerText;
                        const transformedPrice = (await window.transformPriceIntoValidNumber(price)) || 0;

                        const maxWarmRent = await window.getMaxWarmRent();

                        if (
                            address &&
                            !containsDisqualifyingPattern &&
                            !!relevantDistrict &&
                            transformedPrice <= maxWarmRent
                        ) {
                            results.push({
                                address,
                                id: item.getAttribute("id") || address,
                                title,
                                region: relevantDistrict?.district || "-",
                                link: `https://www.vonovia.de${item.querySelector(".links")?.getElementsByTagName("a")[0].getAttribute("href")}`,
                                size: (item.querySelectorAll(".features-wrap .badge")[0] as HTMLElement | undefined)
                                    ?.innerText,
                                rooms: Number(
                                    (item.querySelectorAll(".features-wrap .badge")[1] as HTMLElement | undefined)
                                        ?.innerText[0],
                                ),
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
