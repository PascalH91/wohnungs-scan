/**
 * Rent helpers: turn a scraped amount into one display string such as
 * "1.762 € warm", so the offer store and the monthly report can show prices
 * from every provider in the same shape.
 */

export type RentKind = "warm" | "kalt";

const euroFormat = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });

// Plausible monthly rent; anything outside is a deposit, a fee or a mis-parse.
const MIN_RENT = 100;
const MAX_RENT = 20000;

/** "1.762 € warm" (or "1.762 €" when the kind is unknown); undefined when not a plausible rent. */
export function formatPrice(amount: number | null | undefined, kind?: RentKind): string | undefined {
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < MIN_RENT || amount > MAX_RENT) {
        return undefined;
    }
    return `${euroFormat.format(amount)} €${kind ? ` ${kind}` : ""}`;
}

/** German-formatted amount ("1.761,59", "1498,50", "1.900") → number. */
function parseAmount(raw: string): number {
    const compact = raw.replace(/\s/g, "");
    // A dot followed by 1–2 digits at the end is a decimal point ("767.69").
    if (/^\d+\.\d{1,2}$/.test(compact)) return parseFloat(compact);
    return parseFloat(compact.replace(/\./g, "").replace(",", "."));
}

const AMOUNT = /(\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|EUR\b|Euro\b)/gi;
const WARM = /warm|gesamt|brutto|inkl/gi;
const COLD = /kalt|netto|grundmiete/gi;
// Other money figures on a listing card that are not the rent.
const NOT_RENT = /neben|heiz|betriebs|kaution|provision|anteil|stellplatz|garage/i;

/** Kind of the label closest to the end of `text` (for text before an amount). */
function lastLabel(text: string): RentKind | undefined {
    const lastIndex = (re: RegExp) => Math.max(-1, ...Array.from(text.matchAll(re)).map((m) => m.index ?? -1));
    const warm = lastIndex(WARM);
    const cold = lastIndex(COLD);
    if (warm < 0 && cold < 0) return undefined;
    return warm > cold ? "warm" : "kalt";
}

/** Kind of the label closest to the start of `text` (for text after an amount). */
function firstLabel(text: string): RentKind | undefined {
    const firstIndex = (re: RegExp) => text.search(new RegExp(re.source, "i"));
    const warm = firstIndex(WARM);
    const cold = firstIndex(COLD);
    if (warm < 0 && cold < 0) return undefined;
    if (warm < 0) return "kalt";
    if (cold < 0) return "warm";
    return warm < cold ? "warm" : "kalt";
}

/**
 * Find the rent in a listing card's text. Labels may sit before or after the
 * amount ("Warmmiete 946,35 €" / "946,35 € Warmmiete"). Only the text between
 * this amount and its neighbours is considered, so a label is never borrowed
 * from another figure. Prefers warm rent, then cold rent, then the first
 * unlabeled amount; fees and deposits ("Nebenkosten", "Kaution") are skipped.
 * `fallbackKind` labels an unlabeled amount when the provider's rent kind is
 * known (e.g. a price field that is always the cold rent).
 */
export function extractPrice(text?: string | null, fallbackKind?: RentKind): string | undefined {
    const value = (text ?? "").replace(/\s+/g, " ");
    const found: { amount: number; kind?: RentKind }[] = [];

    for (const match of Array.from(value.matchAll(AMOUNT))) {
        const start = match.index ?? 0;
        const end = start + match[0].length;

        let before = value.slice(Math.max(0, start - 40), start);
        before = before.slice(before.lastIndexOf("€") + 1);
        let after = value.slice(end, end + 25);
        const nextNumber = after.search(/\d/);
        if (nextNumber >= 0) after = after.slice(0, nextNumber);

        const amount = parseAmount(match[1]);
        if (!(amount >= MIN_RENT && amount <= MAX_RENT)) continue;

        const labelBefore = lastLabel(before);
        if (!labelBefore && NOT_RENT.test(before)) continue;
        const kind = labelBefore ?? (NOT_RENT.test(after) ? null : firstLabel(after));
        if (kind === null) continue;

        found.push({ amount, kind });
    }

    const best = found.find((f) => f.kind === "warm") ?? found.find((f) => f.kind === "kalt") ?? found[0];
    return best ? formatPrice(best.amount, best.kind ?? fallbackKind) : undefined;
}
