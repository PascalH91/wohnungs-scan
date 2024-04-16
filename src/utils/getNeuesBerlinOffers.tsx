import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrowser";
import { generateRandomUA } from "./generateRandomUserAgents";

const neuesBerlinUrl = "https://www.neues-berlin.de/wohnen/wohnungsangebote";

export const getNeuesBerlinOffers = async () => {
    try {
        const browser = await getBrowser();

        const page = await browser.newPage();

        // Custom user agent from generateRandomUA() function
        const customUA = generateRandomUA();

        // Set custom user agent
        await page.setUserAgent(customUA);

        page.on("console", (msg) => console.log(msg.text()));

        await page.goto(neuesBerlinUrl, { waitUntil: "networkidle2" });

        let data = await page.evaluate(async () => {
            let results: Offer[] = [];

            let item = document.querySelector("#areaMain");

            item &&
                !item.innerText.includes("Derzeit verfügen wir über keine aktuellen Wohnungsangebote.") &&
                results.push({
                    address: "Neues Angebot",
                    id: "NEUES_BERLIN",
                    title: "Neues Angebot",
                    region: "-",
                    link: "https://www.neues-berlin.de/wohnen/wohnungsangebote",
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
