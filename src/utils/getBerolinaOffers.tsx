import { Offer } from "@/types";
import { createScraper } from "./baseScraper";
import { Page } from "puppeteer-core";
import { berolinaUrl } from "./providerUrls";

// Berolina's listings live in an immosolve single-page app (loaded via a hash
// route), which renders its result list client-side. When empty it shows
// "Momentan sind leider keine Immobilien in unserem Angebot verfügbar" /
// "Keine Ergebnisse"; otherwise it lists flats. We can't enumerate the cards
// reliably (the list is empty right now, so the populated markup is unknown), so
// this stays a presence check: alert with a single synthetic offer whenever the
// app has rendered AND the "no offers" notice is absent.
async function extractBerolinaOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
    // SPA: wait until the result list has actually rendered (the word "Ergebnis"
    // appears in both the empty "Keine Ergebnisse" and the populated states), so
    // we never read a half-loaded page. `loaded` stays false on timeout.
    const loaded = await page
        .waitForFunction(() => /ergebnis/i.test(document.body.innerText), { timeout: 15000 })
        .then(() => true)
        .catch(() => false);

    const offers = await page.evaluate((didLoad) => {
        // Couldn't confirm the list rendered — stay silent rather than emit a
        // false "new offer".
        if (!didLoad) return [] as Offer[];

        const text = document.body.innerText;
        const noOffers = /keine immobilien|keine ergebnisse/i.test(text);
        if (noOffers) return [] as Offer[];

        return [
            {
                address: "Neues Angebot",
                id: "BEROLINA",
                title: "Neues Angebot",
                region: "-",
                link: "https://berolina.info/allgemein/wohnungssuche/",
                size: "0",
                rooms: 0,
            },
        ];
    }, loaded);

    return { offers, isMultiPages: false };
}

export const getBerolinaOffers = createScraper({
    providerName: "Berolina",
    url: berolinaUrl,
    extractOffers: extractBerolinaOffers,
    // Presence-only and intentionally without an anchor: the immosolve app uses
    // content-hashed markup we can't pin to a stable element, and the extractor
    // already stays silent when the list fails to render.
    health: {
        presenceOnly: true,
    },
});
