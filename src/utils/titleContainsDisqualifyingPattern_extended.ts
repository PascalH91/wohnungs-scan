export const titleContainsDisqualifyingPatternExtended = (inputString?: string) => {
    const pattern =
        /ntermiete| befristet|ntervermietung|Möbliert| möbliert|Befristet|UNTERMIETE|ZWISCHENMIETE|wischenmiete|wir suchen|WG Bewohner|Wir suchen/;
    const datumPattern =
        /(?:\bvom?\b|\b(?:vermieten|von|bis)\b)\s*(\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?)\s*(?:bis|-)\s*(\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?)/i;

    const untilPattern = /\b(bis|-) ?\d{2}[./]\d{2}[./]\d{2,4}\b|\b(bis|-)?\d{2}[./]\d{2}[./]\d{2,4}\b/;

    const limitedMonthsAmountPattern = /\bfür \d+ Monate\b/;

    const testPattern = /test/;

    const result =
        !!pattern.test(inputString || "") ||
        !!datumPattern.test(inputString || "") ||
        !!untilPattern.test(inputString || "") ||
        !!limitedMonthsAmountPattern.test(inputString || "");

    return result;
};
