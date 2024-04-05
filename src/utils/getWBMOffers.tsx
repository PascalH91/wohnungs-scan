import { Offer } from "@/components/provider/GEWOBAG/GEWOBAG";
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

        let urls = await page.evaluate(() => {
            let results: Offer[] = [];

            // console.log(document.querySelector("div").getInnerHTML);
            let items = document.querySelectorAll(".openimmo-search-list-item") || [];

            items.forEach((item) => {
                console.log(item.innerHTML);
                const title = item.querySelector("h2");
                const address = item.querySelector(".address")?.innerHTML;

                if (title && address) {
                    results.push({
                        address,
                        id: `${item.getAttribute("data-id")}_${item.getAttribute("data-uid")}`,
                        title: title?.innerHTML,
                        region: item.querySelector(".area")?.innerHTML,
                        link: item.querySelector(".btn-holder")?.getElementsByTagName("a")[0].getAttribute("href"),
                        size: item.querySelector(".main-property-size")?.innerText,
                        rooms: +item.querySelector(".main-property-rooms")?.innerText,
                    });
                }
            });
            return results;
        });
        browser.close();
        return urls;
    } catch (e: any) {
        console.log(e);
        return [];
    }
};
