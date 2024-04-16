import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrowser";
import { generateRandomUA } from "./generateRandomUserAgents";
import { containsRelevantCityCode } from "./containsRelevantCityCodes";
import { titleContainsDisqualifyingPattern } from "./titleContainsDisqualifyingPattern";
import { transformPrice } from "./transformPrice";

const vonoviaUrl =
    "https://www.vonovia.de/zuhause-finden/immobilien?rentType=miete&city=Berlin&lift=0&parking=0&cellar=0&immoType=wohnung&priceMax=1300&sizeMin=65&minRooms=2&floor=Beliebig&bathtub=0&bathwindow=0&bathshower=0&furnished=0&kitchenEBK=0&toiletSeparate=0&disabilityAccess=egal&seniorFriendly=0&balcony=egal&garden=0&subsidizedHousingPermit=egal&scroll=true";

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

        await page.goto(vonoviaUrl, { waitUntil: "networkidle2" });

        let data = await page.evaluate(async () => {
            let results: Offer[] = [];
            let items = document.querySelectorAll(".teasers .content-card");

            items &&
                (await Promise.all(
                    Array.from(items).map(async (item) => {
                        const address = item.querySelector(".rte")?.innerText;
                        const relevantDistrict = await window.isInRelevantDistrict(address);
                        const title = item.querySelector("h2")?.innerText;
                        const containsDisqualifyingPattern = await window.containsDisqualifyingPattern(title);
                        const price = item.querySelector(".price")?.innerText;
                        const transformedPrice = await window.transformPriceIntoValidNumber(price);

                        if (address && !containsDisqualifyingPattern && !!relevantDistrict && transformedPrice < 1250) {
                            results.push({
                                address,
                                id: item.getAttribute("id") || address,
                                title,
                                region: relevantDistrict?.district || "-",
                                link: `https://www.vonovia.de${item.querySelector(".links")?.getElementsByTagName("a")[0].getAttribute("href")}`,
                                size: item.querySelectorAll(".features-wrap .badge")[0]?.innerText,
                                rooms: +item.querySelectorAll(".features-wrap .badge")[1]?.innerText[0],
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
