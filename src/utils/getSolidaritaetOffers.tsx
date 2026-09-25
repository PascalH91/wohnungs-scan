import { createSentinelScraper } from "./sentinelScraper";
import { solidariaetUrl } from "./providerUrls";

// Formidable-Forms list: renders ".frm_no_entries" ("Aktuell stehen leider keine
// Mietangebote zur Verfügung.") when there are no offers.
export const getSolidaritaetOffers = createSentinelScraper({
    providerName: "Solidarität",
    url: solidariaetUrl,
    offerId: "SOLIDARITAET",
    contentSelector: ".template-page .entry-content-wrapper",
    emptyState: {
        selector: ".frm_no_entries",
        text: "keine Mietangebote",
    },
});
