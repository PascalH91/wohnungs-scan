import { Offer } from "@/components/Provider";
import puppeteer from "puppeteer";

const friedrichsheimUrl = "https://www.friedrichsheim-eg.de/category/freie-wohnungen/";

export const getFRIEDRICHSHEIMOffers = async () => {
    try {
        const browser = await puppeteer.launch({
            dumpio: true,
        });

        const page = await browser.newPage();
        page.on("console", (msg) => console.log(msg.text()));
        await page.goto(friedrichsheimUrl, { waitUntil: "networkidle2" });

        let data = await page.evaluate(async () => {
            let results: Offer[] = [];
            let items = document.querySelectorAll("article");

            items.forEach(async (item) => {
                const title = item.querySelector("h2");
                const blockageBanner = item.querySelector(".eins");
                function calculateDaysDifference(targetDateStr: string) {
                    const [targetDay, targetMonth, targetYear] = targetDateStr.split(".").map(Number);
                    const targetDate = new Date(targetYear, targetMonth - 1, targetDay);
                    const currentDate = new Date();
                    const differenceMs = targetDate.getTime() - currentDate.getTime();
                    const differenceDays = Math.floor(differenceMs / (1000 * 60 * 60 * 24));
                    return differenceDays;
                }
                const convertDateFromBanner = async (text?: string) => {
                    if (!text) {
                        return undefined;
                    }
                    const regex = /\d{2}\.\d{2}\.\d{4}/; // Regex to match date in DD.MM.YYYY format
                    const match = text.match(regex);

                    if (match) {
                        const extractedDate = match[0];
                        return calculateDaysDifference(extractedDate);
                    } else {
                        return undefined;
                    }
                };

                if (title && +title.innerText[0] > 1) {
                    results.push({
                        address: title.innerText,
                        id: item.getAttribute("id")!,
                        title: title.innerText,
                        region: "Friedrichshain",
                        link: title.getElementsByTagName("a")[0].getAttribute("href"),
                        size: "-",
                        rooms: +title.innerText[0],
                        blocked: !!blockageBanner,
                        daysUntilAccessible: await convertDateFromBanner(blockageBanner?.innerText),
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
