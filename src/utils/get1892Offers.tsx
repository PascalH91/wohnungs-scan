import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrowser";
import { generateRandomUA } from "./generateRandomUserAgents";

export const eg1892Url = "https://hpm2.immosolve.eu/immosolve_presentation/pub/modern/2145111/HP/immo.jsp";

export const get1892Offers = async () => {
    try {
        const browser = await getBrowser();

        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(10 * 60 * 1000);
        // Custom user agent from generateRandomUA() function
        const customUA = generateRandomUA();

        // Set custom user agent
        await page.setUserAgent(customUA);

        page.on("console", (msg) => console.log(msg.text()));

        const response = await page.goto(eg1892Url, { waitUntil: "networkidle2" });
        if (response?.status() !== 200) {
            throw new Error(`${response?.status()} ${response?.statusText()}`);
        }

        await page.waitForNavigation();
        await page.waitForSelector("#locationChoices", {
            visible: true,
        });

        let data = await page.evaluate(async () => {
            let isMultiPages = false;
            let results: Offer[] = [];

            let item = document.querySelector("#locationChoices") as HTMLElement | undefined;

            item &&
                !item.innerText.includes("Momentan sind leider keine Objekte in unserem Onlineangebot verfügbar.") &&
                results.push({
                    address: "Neues Angebot",
                    id: "1892",
                    title: "Neues Angebot",
                    region: "-",
                    link: "https://hpm2.immosolve.eu/immosolve_presentation/pub/modern/2145111/HP/immo.jsp",
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
