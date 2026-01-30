import { Offer } from "@/types";
import { config } from "@/config";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { forumKreuzbergUrl } from "./providerUrls";

const { minRoomSize, minRoomNumber, maxColdRent, maxWarmRent } = config.apartment;

async function extractForumKreuzbergOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    return await page.evaluate(async () => {
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
}

export const getForumKreuzbergOffers = createScraper({
    providerName: "Forum Kreuzberg",
    url: forumKreuzbergUrl,
    extractOffers: extractForumKreuzbergOffers,
});
