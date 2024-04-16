import { Offer } from "@/components/Provider/index";
import { getBrowser } from "./getBrower";
import { generateRandomUA } from "./generateRandomUserAgents";

const evmUrl = "https://www.evmberlin.de/wohnungsbestand/";

export const getEVMOffers = async () => {
    try {
        const browser = await getBrowser();

        const page = await browser.newPage();

        // Custom user agent from generateRandomUA() function
        const customUA = generateRandomUA();

        // Set custom user agent
        await page.setUserAgent(customUA);

        page.on("console", (msg) => console.log(msg.text()));

        await page.goto(evmUrl, { waitUntil: "networkidle2" });

        let data = await page.evaluate(async () => {
            let results: Offer[] = [];

            let item = document.querySelector(".note-attention");

            !item.innerText.includes(
                "Da wir zusätz­lich unse­re EDV umstel­len und an die wach­sen­den digi­ta­len Ansprü­chen anpas­sen, ist in die­ser Umstel­lungs­pha­se eine Auf­nah­me von neu­en Woh­nungs­in­ter­es­sen­ten nicht mög­lich.",
            ) &&
                results.push({
                    address: "Neues Angebot",
                    id: "EVM",
                    title: "Neues Angebot",
                    region: "-",
                    link: "https://www.evmberlin.de/wohnungsbestand/",
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
