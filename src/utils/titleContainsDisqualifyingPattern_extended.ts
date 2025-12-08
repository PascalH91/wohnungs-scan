export const titleContainsDisqualifyingPatternExtended = (inputString?: string) => {
    const pattern =
        /ntermiete| befristet|ntervermietung|interim|nterzuvermiete|Möbliert|eilgewerbe| möbliert| möbiliert|Befristet|UNTERMIETE|ZWISCHENMIETE|furnished|Furnished|subletting|Subletting|Sublet|sublet|wischenmiete|wischennutzung|wir suchen|WG Bewohner|WG-Wohnung|WG Zimmer|WG-Zimmer|Kurzzeitmiete|hort term|Paar sucht Wohnung|taugliche Wohnung gesucht|auf Zeit|Wir suchen/;
    const datumPattern =
        /(?:\bvom?\b|\b(?:vermieten|von|bis)\b)\s*(\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?)\s*(?:bis|-)\s*(\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?)/i;

    const untilPattern = /\b(bis|-) ?\d{2}[./]\d{2}(?:[./]\d{2,4})?\b|\b(bis|-)?\d{2}[./]\d{2}(?:[./]\d{2,4})?\b/;

    const limitedMonthsAmountPattern = /\bfür \d+ Monate\b/;

    const testPattern = /test/;

    const result =
        !!pattern.test(inputString || "") ||
        !!datumPattern.test(inputString || "") ||
        !!untilPattern.test(inputString || "") ||
        !!limitedMonthsAmountPattern.test(inputString || "");

    return result;
};
