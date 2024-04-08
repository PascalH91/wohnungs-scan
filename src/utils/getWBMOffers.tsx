import { Offer } from "@/components/Provider/Provider";
import puppeteer from "puppeteer";
// import { JSDOM } from "jsdom";

const wbmUrl = "https://www.wbm.de/wohnungen-berlin/angebote/";

export const getWBMOffers = async () => {
    try {
        const browser = await puppeteer.launch({
            dumpio: true,
        });
        const page = await browser.newPage();

        page.on("console", (msg) => console.log(msg.text()));
        await page.goto(wbmUrl, { waitUntil: "networkidle2" });

        let data = await page.evaluate(() => {
            let results: Offer[] = [];

            let items = document.querySelectorAll(".openimmo-search-list-item") || [];

            items.forEach((item) => {
                const title = item.querySelector("h2");
                const address = item.querySelector(".address")?.innerText;
                const propertylist = item.getElementsByTagName("li");
                const isWBS = Array.from(propertylist).some((prop) => prop.innerText === "WBS");

                if (title && address && !isWBS) {
                    results.push({
                        address,
                        id: `${item.getAttribute("data-id")}_${item.getAttribute("data-uid")}`,
                        title: title?.innerHTML,
                        region: item.querySelector(".area")?.innerHTML,
                        link: `https://www.wbm.de${item.querySelector(".btn-holder")?.getElementsByTagName("a")[0].getAttribute("href")}`,
                        size: item.querySelector(".main-property-size")?.innerText,
                        rooms: +item.querySelector(".main-property-rooms")?.innerText,
                    });
                }
            });
            return results;
        });
        browser.close();
        return data;
    } catch (e: any) {
        console.log(e);
        return [];
    }
};
