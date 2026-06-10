import { createDeuwoApiScraper } from "./deuwoApi";
import { deutscheWohnenApiUrl } from "./providerUrls";

/**
 * Scrape Deutsche Wohnen for available apartments via its JSON list endpoint
 * (the Vonovia-family "deuwo" data set) instead of the rendered page.
 */
export const getDEUTSCHEWOHNENOffers = createDeuwoApiScraper({
    providerName: "Deutsche Wohnen",
    apiUrl: deutscheWohnenApiUrl,
    detailBaseUrl: "https://www.deutsche-wohnen.com/mieten/mietangebote",
});
