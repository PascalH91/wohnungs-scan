import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrowser";
import { generateRandomUA } from "./generateRandomUserAgents";

export const solidariaetUrl = "https://wg-solidaritaet.de/wohnen/mietangebote/";

export const getSolidaritaetOffers = async () => {
    try {
        const browser = await getBrowser();

        const page = await browser.newPage();

        // Custom user agent from generateRandomUA() function
        const customUA = generateRandomUA();

        // Set custom user agent
        await page.setUserAgent(customUA);

        page.on("console", (msg) => console.log(msg.text()));

        await page.goto(solidariaetUrl, { waitUntil: "networkidle2" });

        let data = await page.evaluate(async () => {
            let isMultiPages = false;
            let results: Offer[] = [];

            let items = document.querySelectorAll(".frm_no_entries");

            !items &&
                results.push({
                    address: "Neues Angebot",
                    id: "SOLIDARITAET",
                    title: "Neues Angebot",
                    region: "-",
                    link: "https://wg-solidaritaet.de/wohnen/mietangebote/",
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
