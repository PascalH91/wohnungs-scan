import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrowser";
import { generateRandomUA } from "./generateRandomUserAgents";

export const wgVorwaertsUrl = "https://www.wg-vorwaerts.de/wohnungssuche/";

export const getWGVorwaertsOffers = async () => {
    try {
        const browser = await getBrowser();

        const page = await browser.newPage();

        // Custom user agent from generateRandomUA() function
        const customUA = generateRandomUA();

        // Set custom user agent
        await page.setUserAgent(customUA);

        page.on("console", (msg) => console.log(msg.text()));

       const response = await page.goto(wgVorwaertsUrl, { waitUntil: "networkidle2" });
       if (response?.status() !== 200) {
           throw new Error(`${response?.status()} ${response?.statusText()}`);
       }

        let data = await page.evaluate(async () => {
            let isMultiPages = false;
            let results: Offer[] = [];

            let item = document.querySelector("#ContentContainer") as HTMLElement | undefined;

            item &&
                !item.innerText.includes("Sofern eine Wohnung verfügbar ist, wird sie hier eingestellt.") &&
                results.push({
                    address: "Neues Angebot",
                    id: "WG_VORWAERTS",
                    title: "Neues Angebot",
                    region: "-",
                    link: "https://www.wg-vorwaerts.de/wohnungssuche/",
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
