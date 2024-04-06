import { Offer } from "@/components/Provider/Provider";
import puppeteer from "puppeteer";

const deutscheWohnenUrl =
    "https://www.deutsche-wohnen.com/immobilienangebote#page=1&locale=de&commercializationType=rent&utilizationType=flat,retirement&location=10243&radius=10&area=60&rooms=2";

export const getDEUTSCHEWOHNENOffers = async () => {
    try {
        const browser = await puppeteer.launch({
            dumpio: true,
        });
        const page = await browser.newPage();

        page.on("console", (msg) => console.log(msg.text()));
        await page.goto(deutscheWohnenUrl, { waitUntil: "networkidle2" });

        let data = await page.evaluate(() => {
            let results: Offer[] = [];
            let items = document.querySelectorAll(".object-list__item");

            items.forEach((item) => {
                const title = item.querySelector("h2")?.innerText;
                const address = item.querySelector(".object-list__address").innerText;
                const splitAddress = address?.split(" ");
                const district = splitAddress?.[splitAddress.length - 1];

                const specs = item.querySelector(".object-list__detail-items").innerText?.split("|");

                if (title && address) {
                    results.push({
                        id: item.getAttribute("id") || address,
                        address,
                        title,
                        region: district,
                        link: `https://www.deutsche-wohnen.com${item?.getElementsByTagName("a")[0].getAttribute("href")}`,
                        size: specs[0],
                        rooms: specs[1],
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
