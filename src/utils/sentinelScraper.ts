import { createHash } from "crypto";
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
 *   - empty-state notice present    → no offer, and the episode ends (see below)
 *   - content present, notice gone  → ONE synthetic "Neues Angebot" offer
 *
 * Identity: the synthetic offer's id is a hash of the WHOLE content text, so any
 * change anywhere in the content area (e.g. a second flat added further down)
 * becomes a new offer and alerts again. A reworded "no apartments" notice also
 * alerts — deliberately: better one false alarm than a missed flat.
 *
 * Episodes: once the page positively shows its empty state again, the offers
 * seen so far are retired (confirmedEmpty → retireOffers). If the exact same
 * text is published again later, it therefore still alerts.
 */
export interface SentinelScraperConfig {
    providerName: string;
    url: string;
    /** Prefix of the synthetic offer's id (usually the UI provider id). */
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

// Enough of the content text to recognise the offer in the notification title,
// without letting a whole page end up there.
const SNIPPET_LENGTH = 160;

export function createSentinelScraper({
    providerName,
    url,
    offerId,
    contentSelector,
    emptyState,
}: SentinelScraperConfig) {
    async function extractOffers(
        page: Page,
    ): Promise<{ offers: Offer[]; isMultiPages: boolean; confirmedEmpty: boolean }> {
        const result = await page.evaluate(
            ({ contentSelector, emptySelector, emptyText }) => {
                const content = document.querySelector(contentSelector);
                if (!content) return { state: "missing" as const, text: "" };

                const text = (content.textContent ?? "").replace(/\s+/g, " ").trim();
                if (!text) return { state: "missing" as const, text: "" };

                const isEmpty =
                    (!!emptySelector && !!content.querySelector(emptySelector)) ||
                    (!!emptyText && text.toLowerCase().includes(emptyText.toLowerCase()));

                return { state: isEmpty ? ("empty" as const) : ("content" as const), text };
            },
            { contentSelector, emptySelector: emptyState.selector ?? "", emptyText: emptyState.text ?? "" },
        );

        if (result.state !== "content") {
            // Only a positively-seen empty notice ends the episode — a page that
            // failed to render must not reset it (the same offer would re-alert).
            return { offers: [], isMultiPages: false, confirmedEmpty: result.state === "empty" };
        }

        const { text } = result;
        const contentHash = createHash("sha256").update(text).digest("hex").slice(0, 16);
        const snippet = text.length > SNIPPET_LENGTH ? `${text.slice(0, SNIPPET_LENGTH)}…` : text;
        return {
            offers: [
                {
                    address: "Neues Angebot",
                    id: `${offerId}-${contentHash}`,
                    title: `Neues Angebot: ${snippet}`,
                    region: "-",
                    link: url,
                    size: "0",
                    rooms: 0,
                },
            ],
            isMultiPages: false,
            confirmedEmpty: false,
        };
    }

    return createScraper({
        providerName,
        url,
        stableId: true, // content hash
        extractOffers,
        health: {
            presenceOnly: true,
            anchorSelector: contentSelector,
        },
    });
}
