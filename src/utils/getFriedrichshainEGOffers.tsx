import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrower";
import { generateRandomUA } from "./generateRandomUserAgents";

const FriedrichshainEGUrl = "https://www.wbg-friedrichshain-eg.de/wohnungssuche/wohnungsangebote";

export const getFriedrichshainEGOffers = async () => {
    try {
        const browser = await getBrowser();

        const page = await browser.newPage();

        // Custom user agent from generateRandomUA() function
        const customUA = generateRandomUA();

        // Set custom user agent
        await page.setUserAgent(customUA);

        page.on("console", (msg) => console.log(msg.text()));

        await page.goto(FriedrichshainEGUrl, { waitUntil: "networkidle2" });

        let data = await page.evaluate(async () => {
            let results: Offer[] = [];

            let items = document.querySelectorAll("h3");

            items[0].innerText !== "Zurzeit sind keine Wohnungsangebote verfügbar" &&
                results.push({
                    address: "Neues Angebot",
                    id: "FRIEDRICHSHAIN_EG",
                    title: "Neues Angebot",
                    region: "-",
                    link: "https://www.wbg-friedrichshain-eg.de/wohnungssuche/wohnungsangebote",
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
