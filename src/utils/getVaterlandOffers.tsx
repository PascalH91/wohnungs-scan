import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrower";
import { generateRandomUA } from "./generateRandomUserAgents";

const vaterlandUrl = "https://www.bg-vaterland.de/index.php?id=31";

export const getVaterlandOffers = async () => {
    try {
        const browser = await getBrowser();

        const page = await browser.newPage();

        // Custom user agent from generateRandomUA() function
        const customUA = generateRandomUA();

        // Set custom user agent
        await page.setUserAgent(customUA);

        page.on("console", (msg) => console.log(msg.text()));

        await page.goto(vaterlandUrl, { waitUntil: "networkidle2" });

        let data = await page.evaluate(async () => {
            let results: Offer[] = [];

            let item = document.querySelector("#content");

            !item.innerText.includes("Momentan können wir Ihnen keine freien Wohnungen anbieten.") &&
                results.push({
                    address: "Neues Angebot",
                    id: "VATERLAND",
                    title: "Neues Angebot",
                    region: "-",
                    link: "https://www.bg-vaterland.de/index.php?id=31",
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
