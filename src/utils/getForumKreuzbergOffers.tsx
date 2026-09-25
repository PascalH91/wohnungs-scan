import { createSentinelScraper } from "./sentinelScraper";
import { forumKreuzbergUrl } from "./providerUrls";

// Forum Kreuzberg (WordPress block theme) no longer lists offers; its
// "Wohnungsvergabe" page reads "Das Forum vergibt derzeit keine Wohnungen." while
// allocation is closed. Any other content there is worth a look.
export const getForumKreuzbergOffers = createSentinelScraper({
    providerName: "Forum Kreuzberg",
    url: forumKreuzbergUrl,
    offerId: "FORUM_KREUZBERG",
    contentSelector: "main",
    emptyState: {
        text: "vergibt derzeit keine Wohnungen",
    },
});
