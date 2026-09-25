import { createSentinelScraper } from "./sentinelScraper";
import { vbvUrl } from "./providerUrls";

// Vaterländischer Bauverein eG (Contao CMS). The article body reads
// "Derzeit stehen keine Wohnungsangebote zur Verfügung." when empty.
export const getVBVOffers = createSentinelScraper({
    providerName: "VBV",
    url: vbvUrl,
    offerId: "VBV",
    contentSelector: "#main .mod_article",
    emptyState: {
        text: "keine Wohnungsangebote",
    },
});
