import { Offer } from "@/types";
import { Page } from "puppeteer-core";
import { createScraper } from "./baseScraper";

/**
 * Factory for "sentinel" providers: small cooperatives whose offers page is
 * usually empty and shows a fixed "no apartments" notice. With nothing to use as
 * a listing-card reference, we instead check the content area itself:
 *
 *   - content area missing          → no offer; health flags the missing anchor
 *   - content area has no text      → no offer (page didn't render properly)
 *   - empty-state notice present    → no offer (genuinely nothing available)
 *   - content present, notice gone  → ONE synthetic "Neues Angebot" offer
 *
 * The synthetic offer's title carries a snippet of the content text, so if the
 * page later changes to a different offer, it fingerprints as new and alerts
 * again. A reworded "no apartments" notice also alerts — deliberately: better
 * one false alarm than a missed flat.
 */
export interface SentinelScraperConfig {
    providerName: string;
    url: string;
    /** Constant id of the synthetic offer (usually the UI provider id). */
    offerId: string;
    /** Content area that exists whether or not there are offers. */
    contentSelector: string;
    /** How the page renders "no offers" — matching either one counts as empty. */
    emptyState: {
        /** Element that only exists in the empty state (inside contentSelector). */
        selector?: string;
        /** Text that only appears in the empty state (case-insensitive). */
        text?: string;
    };
}

// Enough of the content text to tell different offers apart without letting a
// whole page end up in the notification title.
const SNIPPET_LENGTH = 160;

export function createSentinelScraper({
    providerName,
    url,
    offerId,
    contentSelector,
    emptyState,
}: SentinelScraperConfig) {
    async function extractOffers(page: Page): Promise<{ offers: Offer[]; isMultiPages: boolean }> {
        const result = await page.evaluate(
            ({ contentSelector, emptySelector, emptyText }) => {
                const content = document.querySelector(contentSelector);
                if (!content) return null;

                const text = (content.textContent ?? "").replace(/\s+/g, " ").trim();
                if (!text) return null;

                const isEmpty =
                    (!!emptySelector && !!content.querySelector(emptySelector)) ||
                    (!!emptyText && text.toLowerCase().includes(emptyText.toLowerCase()));

                return isEmpty ? null : text;
            },
            { contentSelector, emptySelector: emptyState.selector ?? "", emptyText: emptyState.text ?? "" },
        );

        if (!result) return { offers: [], isMultiPages: false };

        const snippet = result.length > SNIPPET_LENGTH ? `${result.slice(0, SNIPPET_LENGTH)}…` : result;
        return {
            offers: [
                {
                    address: "Neues Angebot",
                    id: offerId,
                    title: `Neues Angebot: ${snippet}`,
                    region: "-",
                    link: url,
                    size: "0",
                    rooms: 0,
                },
            ],
            isMultiPages: false,
        };
    }

    return createScraper({
        providerName,
        url,
        extractOffers,
        health: {
            presenceOnly: true,
            anchorSelector: contentSelector,
        },
    });
}
