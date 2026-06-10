import { createDeuwoApiScraper } from "./deuwoApi";
import { vonoviaApiUrl } from "./providerUrls";

/**
 * Scrape Vonovia for available apartments via its JSON list endpoint instead of
 * the rendered page. Same Vonovia-family data model as Deutsche Wohnen.
 */
export const getVonoviaOffers = createDeuwoApiScraper({
    providerName: "Vonovia",
    apiUrl: vonoviaApiUrl,
    detailBaseUrl: "https://www.vonovia.de/zuhause-finden/immobilien",
});
