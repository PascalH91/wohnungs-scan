import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrowser";
import { generateRandomUA } from "./generateRandomUserAgents";

const eg1892Url = "https://hpm2.immosolve.eu/immosolve_presentation/pub/modern/2145111/HP/immo.jsp";

export const get1892Offers = async () => {
    try {
        const browser = await getBrowser();

        const page = await browser.newPage();

        // Custom user agent from generateRandomUA() function
        const customUA = generateRandomUA();

        // Set custom user agent
        await page.setUserAgent(customUA);

        page.on("console", (msg) => console.log(msg.text()));

        await page.goto(eg1892Url, { timeout: 2000, waitUntil: "domcontentloaded" });
        await page.waitForSelector("#locationChoices", {
            visible: true,
        });

        let data = await page.evaluate(async () => {
            let results: Offer[] = [];

            let item = document.querySelector("#locationChoices");

            item &&
                !item?.innerText.includes("Momentan sind leider keine Objekte in unserem Onlineangebot verfügbar.") &&
                results.push({
                    address: "Neues Angebot",
                    id: "1892",
                    title: "Neues Angebot",
                    region: "-",
                    link: "https://hpm2.immosolve.eu/immosolve_presentation/pub/modern/2145111/HP/immo.jsp",
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
