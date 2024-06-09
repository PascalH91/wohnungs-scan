import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrowser";
import { generateRandomUA } from "./generateRandomUserAgents";

export const berolinaUrl = "https://berolina.info/wohnungsangebote-wenn-angebote-vorhanden/";

export const getBerolinaOffers = async () => {
    try {
        const browser = await getBrowser();

        const page = await browser.newPage();

        // Custom user agent from generateRandomUA() function
        const customUA = generateRandomUA();

        // Set custom user agent
        await page.setUserAgent(customUA);

        page.on("console", (msg) => console.log(msg.text()));

        await page.goto(berolinaUrl, { waitUntil: "networkidle2" });

        let data = await page.evaluate(async () => {
            let isMultiPages = false;
            let results: Offer[] = [];

            let item = document.querySelector(".entrytext") as HTMLElement | undefined;

            item &&
                !item.innerText.includes("Leider haben wir derzeit keine freien Wohnungen im Angebot") &&
                results.push({
                    address: "Neues Angebot",
                    id: "BEROLINA",
                    title: "Neues Angebot",
                    region: "-",
                    link: "https://berolina.info/wohnungsangebote-wenn-angebote-vorhanden/",
                    size: "0",
                    rooms: 0,
                });

            return { offers: results, isMultiPages };
        });

        browser.close();
        return { data, errors: "" };
    } catch (e: any) {
        console.log("e =>", e);
        return { data: [], errors: e };
    }
};
