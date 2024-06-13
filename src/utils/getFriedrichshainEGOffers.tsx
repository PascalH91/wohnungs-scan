import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrowser";
import { generateRandomUA } from "./generateRandomUserAgents";

export const FriedrichshainEGUrl = "https://www.wbg-friedrichshain-eg.de/wohnungssuche/wohnungsangebote";

export const getFriedrichshainEGOffers = async () => {
    try {
        const browser = await getBrowser();

        const page = await browser.newPage();

        // Custom user agent from generateRandomUA() function
        const customUA = generateRandomUA();

        // Set custom user agent
        await page.setUserAgent(customUA);

        page.on("console", (msg) => console.log(msg.text()));

       const response = await page.goto(FriedrichshainEGUrl, { waitUntil: "networkidle2" });
       if (response?.status() !== 200) {
           throw new Error(`${response?.status()} ${response?.statusText()}`);
       }

        let data = await page.evaluate(async () => {
            let isMultiPages = false;
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

            return { offers: results, isMultiPages };
        });

        browser.close();
        return { data, errors: "" };
    } catch (e: any) {
        console.log("e =>", e);
        return { data: [], errors: e.message };
    }
};
