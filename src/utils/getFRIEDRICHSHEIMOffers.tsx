import { Offer } from "@/components/provider/GEWOBAG/GEWOBAG";
import puppeteer from "puppeteer";

const gewobagUrl = "https://www.friedrichsheim-eg.de/category/freie-wohnungen/";

export const getFRIEDRICHSHEIMOffers = async () => {
    try {
        const browser = await puppeteer.launch({
            dumpio: true,
        });
        const page = await browser.newPage();

        page.on("console", (msg) => console.log(msg.text()));
        await page.goto(gewobagUrl, { waitUntil: "networkidle2" });

        let urls = await page.evaluate(() => {
            // const containsSpecificPattern = (inputString?: string) => {
            //     const pattern = /,\s*WBS\s*[\w\s%]*erforderlich|Wohnaktiv! Wohnen ab.*$/;
            //     return !pattern.test(inputString || "");
            // };

            let results: Offer[] = [];
            let items = document.querySelectorAll("article");

            items.forEach((item) => {
                const title = item.querySelector("h2");

                if (title && +title.innerText[0] > 1) {
                    results.push({
                        address: title.innerText,
                        id: item.getAttribute("id")!,
                        title: title.innerText,
                        region: "Friedrichshain",
                        link: title.getElementsByTagName("a")[0].getAttribute("href"),
                        size: "-",
                        rooms: +title.innerText[0],
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
