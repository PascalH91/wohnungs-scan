import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrowser";
import { generateRandomUA } from "./generateRandomUserAgents";

export const paradiesUrl = "https://abg-paradies.de/wohnungsangebote/";

export const getParadiesOffers = async () => {
    try {
        const browser = await getBrowser();

        const page = await browser.newPage();

        // Custom user agent from generateRandomUA() function
        const customUA = generateRandomUA();

        // Set custom user agent
        await page.setUserAgent(customUA);

        page.on("console", (msg) => console.log(msg.text()));

        await page.goto(paradiesUrl, { waitUntil: "networkidle2" });

        let data = await page.evaluate(async () => {
            let isMultiPages = false;
            let results: Offer[] = [];

            let item = document.querySelector("p") as HTMLElement | undefined;

            item &&
                !item.innerText.includes("Versuchen Sie es zu einem späteren Zeitpunkt nochmals.") &&
                results.push({
                    address: "Neues Angebot",
                    id: "PARADIES",
                    title: "Neues Angebot",
                    region: "-",
                    link: "https://abg-paradies.de/wohnungsangebote/",
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
