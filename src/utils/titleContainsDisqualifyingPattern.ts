export const titleContainsDisqualifyingPattern = (inputString?: string) => {
    const pattern =
        /^MIT\s* WBS\s*[\w\s%]*|^WBS\s*[\w\s%]*erforderlich.*|,\s*WBS\s*[\w\s%]*erforderlich|WBS 140|WBS 160|WBS 180|WBS 200|WBS 220|mit WBS|könnten Sie berechtigt sein|Wohnaktiv! Wohnen ab.*$/;

    const result = !!pattern.test(inputString || "");

    return result;
};

