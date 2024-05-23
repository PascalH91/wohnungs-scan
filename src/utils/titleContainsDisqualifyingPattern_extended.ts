export const titleContainsDisqualifyingPatternExtended = (inputString?: string) => {
    const pattern = /ntermiete| befristet|Befristet|UNTERMIETE|ZWISCHENMIETE|wischenmiete|wir suchen|Wir suchen/;
    const datumPattern =
        /(?:\bvom?\b|\b(?:vermieten|von|bis)\b)\s*(\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?)\s*(?:bis|-)\s*(\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?)/i;

    const testPattern = /test/;

    const result = !!pattern.test(inputString || "") || !!datumPattern.test(inputString || "");

    return result;
};
