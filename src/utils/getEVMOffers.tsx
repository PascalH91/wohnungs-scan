import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { evmUrl } from "./providerUrls";

const { minRoomSize, minRoomNumber, maxColdRent, maxWarmRent } = config.apartment;

async function extractEVMOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    return await page.evaluate(async () => {
        let isMultiPages = false;
        let results: Offer[] = [];
        let item = document.querySelector(".note-attention") as HTMLElement | undefined;

        item &&
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

        return { offers: results, isMultiPages };
    });
}

export const getEVMOffers = createScraper({
    providerName: "EVM",
    url: evmUrl,
    extractOffers: extractEVMOffers,
});
