import { Offer } from "@/components/Provider/Provider";
import puppeteer from "puppeteer";

const howogeUrl =
    "https://www.howoge.de/immobiliensuche/wohnungssuche.html?tx_howsite_json_list%5Bpage%5D=1&tx_howsite_json_list%5Blimit%5D=12&tx_howsite_json_list%5Blang%5D=&tx_howsite_json_list%5Bkiez%5D%5B%5D=Friedrichshain-Kreuzberg&tx_howsite_json_list%5Bkiez%5D%5B%5D=Mitte&tx_howsite_json_list%5Bkiez%5D%5B%5D=Lichtenberg&tx_howsite_json_list%5Bkiez%5D%5B%5D=Treptow-K%C3%B6penick&tx_howsite_json_list%5Bkiez%5D%5B%5D=Charlottenburg-Wilmersdorf&tx_howsite_json_list%5Bkiez%5D%5B%5D=Neuk%C3%B6lln&tx_howsite_json_list%5Bkiez%5D%5B%5D=Pankow&tx_howsite_json_list%5Bkiez%5D%5B%5D=Tempelhof-Sch%C3%B6neberg&tx_howsite_json_list%5Brooms%5D=2";

export const getHOWOGEOffers = async () => {
    try {
        const browser = await puppeteer.launch({
            dumpio: true,
        });
        const page = await browser.newPage();

        page.on("console", (msg) => console.log(msg.text()));
        await page.goto(howogeUrl, { waitUntil: "networkidle2" });

        let data = await page.evaluate(() => {
            const containsSpecificPattern = (inputString?: string) => {
                const pattern = /,\s*WBS\s*[\w\s%]*erforderlich|Wohnaktiv! Wohnen ab.*$/;
                return !!pattern.test(inputString || "");
            };

            let results: Offer[] = [];
            let items = document.querySelectorAll("#immoobject-list .flat-single-grid-item .content");

            items.forEach((item) => {
                const address = item.querySelector(".address")?.innerText;
                const title = item.querySelector(".notice")?.innerHTML;
                const attributes = item.querySelectorAll(".attributes > div .attributes-content");
                console.log({ address, title, attributes });
                if (address && !containsSpecificPattern(title)) {
                    results.push({
                        address,
                        id: item.getAttribute("data-uid") || address,
                        title,
                        region: address.split(", ")[address.split(", ").length - 1],
                        link: `https://www.howoge.de${item?.getElementsByTagName("a")[0].getAttribute("href")}`,
                        size: attributes[1].innerText,
                        rooms: +attributes[2].innerText,
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
