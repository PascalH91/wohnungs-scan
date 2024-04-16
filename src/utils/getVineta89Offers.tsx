import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrowser";
import { generateRandomUA } from "./generateRandomUserAgents";

const vineta89Url = "https://vineta98.de/wohnungen/";

export const getVineta89Offers = async () => {
    try {
        const browser = await getBrowser();

        const page = await browser.newPage();

        // Custom user agent from generateRandomUA() function
        const customUA = generateRandomUA();

        // Set custom user agent
        await page.setUserAgent(customUA);

        page.on("console", (msg) => console.log(msg.text()));

        await page.goto(vineta89Url, { waitUntil: "networkidle2" });

        let data = await page.evaluate(async () => {
            let results: Offer[] = [];

            let item = document.querySelector(".content");
            console.log(document.innerHTML);

            item &&
                !item.innerText &&
                results.push({
                    address: "Neues Angebot",
                    id: "VINETA_89",
                    title: "Neues Angebot",
                    region: "-",
                    link: "https://vineta98.de/wohnungen/",
                    size: "0",
                    rooms: 0,
                });

            return results;
        });

        browser.close();
        return { data, errors: "" };
    } catch (e: any) {
        console.log(e);
        return { data: [], errors: e };
    }
};
