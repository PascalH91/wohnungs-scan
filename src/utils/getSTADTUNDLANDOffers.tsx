import { Offer } from "@/components/Provider/Provider";
import puppeteer from "puppeteer";

const stadtUndLandUrl =
    "https://www.stadtundland.de/immobiliensuche.php?form=stadtundland-expose-search-1.form&sp%3Acategories%5B3352%5D%5B%5D=-&sp%3Acategories%5B3352%5D%5B%5D=__last__&sp%3AroomsFrom%5B%5D=2&sp%3AroomsTo%5B%5D=&sp%3ArentPriceFrom%5B%5D=&sp%3ArentPriceTo%5B%5D=&sp%3AareaFrom%5B%5D=65&sp%3AareaTo%5B%5D=&sp%3Afeature%5B%5D=__last__&action=submit";

export const getSTADTUNDLANDOffers = async () => {
    try {
        const browser = await puppeteer.launch({
            dumpio: true,
        });
        const page = await browser.newPage();

        page.on("console", (msg) => console.log(msg.text()));
        await page.goto(stadtUndLandUrl, { waitUntil: "networkidle2" });

        let data = await page.evaluate(() => {
            const containsSpecificPattern = (inputString?: string) => {
                const pattern = /,\s*WBS\s*[\w\s%]*erforderlich|Wohnaktiv! Wohnen ab.*$/;
                return !pattern.test(inputString || "");
            };

            let results: Offer[] = [];
            let items = document.querySelectorAll(".SP-TeaserList__item");

            items.forEach((item) => {
                const tableEntries = item.getElementsByTagName("td");
                const title = item.querySelector("h2")?.innerText;
                const address = tableEntries[1].innerText;

                if (address && title) {
                    results.push({
                        address,
                        id: tableEntries[0].innerText || address,
                        title,
                        region: " - ",
                        link: `https://www.stadtundland.de${item.querySelector(".SP-Teaser__links")?.getElementsByTagName("a")[0].getAttribute("href")}`,

                        size: tableEntries[3]?.innerText,
                        rooms: tableEntries[2]?.innerText,
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
