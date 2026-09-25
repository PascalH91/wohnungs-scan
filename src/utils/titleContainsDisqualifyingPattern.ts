import { config } from "@/config";

// Titles that mark a flat as WBS-only / income-restricted subsidized housing.
// Only applied while WBS flats are excluded (see config.apartment.includeWbs).
const wbsPattern =
    /^MIT\s* WBS\s*[\w\s%]*|^WBS\s*[\w\s%]*erforderlich.*|,\s*WBS\s*[\w\s%]*erforderlich|WBS 100|WBS 140|WBS 160|WBS 180|WBS 200|WBS 220|mit WBS|nur WBS|könnten Sie berechtigt sein|WBS mit besonderem Wohnbedarf|Wohnbedarf erforderlich|inkommensorientiert|Einkommen zwischen |(WBS erforderlich)/;

// Titles that are always disqualifying, regardless of the WBS setting.
const otherPattern = /eilgewerbe|voll ausgestattet|Wohnaktiv! Wohnen ab.*$/;

/** True when the title marks the flat as WBS-only (independent of includeWbs). */
export const titleIndicatesWbs = (inputString?: string) => wbsPattern.test(inputString || "");

export const titleContainsDisqualifyingPattern = (inputString?: string) => {
    const title = inputString || "";

    if (otherPattern.test(title)) return true;
    if (!config.apartment.includeWbs && wbsPattern.test(title)) return true;

    return false;
};
