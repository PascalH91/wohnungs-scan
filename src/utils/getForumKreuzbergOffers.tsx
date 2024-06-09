import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrowser";
import { generateRandomUA } from "./generateRandomUserAgents";

export const forumKreuzbergUrl = "https://forumkreuzberg.de/s/wohnen/wohnungsangebote/";

export const getForumKreuzbergOffers = async () => {
    try {
        const browser = await getBrowser();

        const page = await browser.newPage();

        // Custom user agent from generateRandomUA() function
        const customUA = generateRandomUA();

        // Set custom user agent
        await page.setUserAgent(customUA);

        page.on("console", (msg) => console.log(msg.text()));

        await page.goto(forumKreuzbergUrl, { waitUntil: "networkidle2" });

        let data = await page.evaluate(async () => {
            let isMultiPages = false;
            let results: Offer[] = [];

            let item = document.querySelector(".content") as HTMLElement | undefined;

            item &&
                !item.innerText.includes("Es sind auf absehbare Zeit leider keine Wohnungen verfübar") &&
                results.push({
                    address: "Neues Angebot",
                    id: "FORUM_KREUZBERG",
                    title: "Neues Angebot",
                    region: "-",
                    link: "https://forumkreuzberg.de/s/wohnen/wohnungsangebote/",
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
