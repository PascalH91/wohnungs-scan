import { createSentinelScraper } from "./sentinelScraper";
import { dieseUrl } from "./providerUrls";

// DIESE eG (WordPress page). The page body reads
// "Zur Zeit stehen keine Wohnungen zur Vermietung an." when empty.
export const getDieseOffers = createSentinelScraper({
    providerName: "DIESE",
    url: dieseUrl,
    offerId: "DIESE",
    contentSelector: "#content .entry-content",
    emptyState: {
        text: "keine Wohnungen zur Vermietung",
    },
});
