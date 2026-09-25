/**
 * Maps an offer address to one of Berlin's 12 official districts (Bezirke).
 *
 * Used by the monthly report — scrapers mostly store region "Berlin" or a
 * neighbourhood, so the district is derived from the address instead:
 *   1. postal code (PLZ) → district
 *   2. otherwise a neighbourhood (Ortsteil) name in the address, e.g. degewo's
 *      "Alt-Britz 27 | Britz"
 *
 * Some postal codes span two districts; each is assigned to the district that
 * covers most of it. Addresses outside Berlin (or without either signal) → null.
 */

// Space-separated postal codes per district.
const PLZ_BY_DISTRICT: Record<string, string> = {
    Mitte: "10115 10117 10119 10178 10179 10551 10553 10555 10557 10559 10785 10787 13347 13349 13351 13353 13355 13357 13359",
    "Friedrichshain-Kreuzberg": "10243 10245 10247 10249 10961 10963 10965 10967 10969 10997 10999",
    Pankow: "10405 10407 10409 10435 10437 10439 13086 13088 13089 13125 13127 13129 13156 13158 13159 13187 13189",
    Lichtenberg: "10315 10317 10318 10319 10365 10367 10369 13051 13053 13055 13057 13059",
    "Charlottenburg-Wilmersdorf":
        "10585 10587 10589 10623 10625 10627 10629 10707 10709 10711 10713 10715 10717 10719 13627 14050 14052 14053 14055 14057 14059 14193 14197 14199",
    "Tempelhof-Schöneberg":
        "10777 10779 10781 10783 10789 10823 10825 10827 10829 12099 12101 12103 12105 12107 12109 12157 12159 12161 12277 12279 12305 12307 12309",
    Neukölln: "12043 12045 12047 12049 12051 12053 12055 12057 12059 12347 12349 12351 12353 12355 12357 12359",
    "Treptow-Köpenick": "12435 12437 12439 12459 12487 12489 12524 12526 12527 12555 12557 12559 12587 12589",
    "Marzahn-Hellersdorf": "12619 12621 12623 12627 12629 12679 12681 12683 12685 12687 12689",
    "Steglitz-Zehlendorf":
        "12163 12165 12167 12169 12203 12205 12207 12209 12247 12249 14109 14129 14163 14165 14167 14169 14195",
    Spandau: "13581 13583 13585 13587 13589 13591 13593 13595 13597 13599 13629 14089",
    Reinickendorf: "13403 13405 13407 13409 13435 13437 13439 13465 13467 13469 13503 13505 13507 13509",
};

// Official Ortsteile plus a few common neighbourhood names providers use.
const NEIGHBOURHOODS_BY_DISTRICT: Record<string, string[]> = {
    Mitte: ["Mitte", "Moabit", "Hansaviertel", "Tiergarten", "Wedding", "Gesundbrunnen"],
    "Friedrichshain-Kreuzberg": ["Friedrichshain", "Kreuzberg"],
    Pankow: [
        "Prenzlauer Berg",
        "Weißensee",
        "Blankenburg",
        "Heinersdorf",
        "Karow",
        "Stadtrandsiedlung Malchow",
        "Pankow",
        "Blankenfelde",
        "Buch",
        "Französisch Buchholz",
        "Niederschönhausen",
        "Rosenthal",
        "Wilhelmsruh",
    ],
    Lichtenberg: [
        "Lichtenberg",
        "Friedrichsfelde",
        "Karlshorst",
        "Rummelsburg",
        "Fennpfuhl",
        "Alt-Hohenschönhausen",
        "Neu-Hohenschönhausen",
        "Hohenschönhausen",
        "Falkenberg",
        "Malchow",
        "Wartenberg",
    ],
    "Charlottenburg-Wilmersdorf": [
        "Charlottenburg-Nord",
        "Charlottenburg",
        "Wilmersdorf",
        "Schmargendorf",
        "Grunewald",
        "Westend",
        "Halensee",
    ],
    "Tempelhof-Schöneberg": ["Schöneberg", "Friedenau", "Tempelhof", "Mariendorf", "Marienfelde", "Lichtenrade"],
    Neukölln: ["Neukölln", "Britz", "Buckow", "Rudow", "Gropiusstadt"],
    "Treptow-Köpenick": [
        "Alt-Treptow",
        "Treptow",
        "Plänterwald",
        "Baumschulenweg",
        "Johannisthal",
        "Niederschöneweide",
        "Oberschöneweide",
        "Altglienicke",
        "Adlershof",
        "Bohnsdorf",
        "Köpenick",
        "Kietzer Feld",
        "Dammvorstadt",
        "Spindlersfeld",
        "Friedrichshagen",
        "Rahnsdorf",
        "Grünau",
        "Müggelheim",
        "Schmöckwitz",
    ],
    "Marzahn-Hellersdorf": [
        "Marzahn",
        "Biesdorf",
        "Kaulsdorf",
        "Mahlsdorf",
        "Hellersdorf",
        "Joachim-Ringelnatz-Siedlung",
        "Ahrensfelder Terrassen",
    ],
    "Steglitz-Zehlendorf": ["Steglitz", "Lichterfelde", "Lankwitz", "Zehlendorf", "Dahlem", "Nikolassee", "Wannsee"],
    Spandau: [
        "Spandau",
        "Haselhorst",
        "Siemensstadt",
        "Staaken",
        "Gatow",
        "Kladow",
        "Hakenfelde",
        "Falkenhagener Feld",
        "Wilhelmstadt",
    ],
    Reinickendorf: [
        "Reinickendorf",
        "Tegel",
        "Konradshöhe",
        "Heiligensee",
        "Frohnau",
        "Hermsdorf",
        "Waidmannslust",
        "Lübars",
        "Wittenau",
        "Märkisches Viertel",
        "Borsigwalde",
    ],
};

const DISTRICT_BY_PLZ = new Map<string, string>(
    Object.entries(PLZ_BY_DISTRICT).flatMap(([district, codes]) => codes.split(" ").map((code) => [code, district])),
);

// Longest names first, so "Marzahn Mitte" matches Marzahn, not Mitte, and
// "Charlottenburg-Nord" wins over "Charlottenburg".
const NEIGHBOURHOODS = Object.entries(NEIGHBOURHOODS_BY_DISTRICT)
    .flatMap(([district, names]) => names.map((name) => ({ name, district })))
    .sort((a, b) => b.name.length - a.name.length)
    .map(({ name, district }) => ({
        district,
        pattern: new RegExp(`(^|[^\\p{L}-])${name.replace(/[-\s]/g, "[-\\s]")}($|[^\\p{L}-])`, "iu"),
    }));

export function districtFromAddress(address?: string): string | null {
    const value = address ?? "";

    for (const plz of value.match(/\b\d{5}\b/g) ?? []) {
        const district = DISTRICT_BY_PLZ.get(plz);
        if (district) return district;
    }

    // The neighbourhood usually trails the street ("Am Falkenberg 11 | Grünau"),
    // so check that last segment first — street names can contain other
    // neighbourhood names ("Falkenberg" is also in Lichtenberg).
    const lastSegment = value.split(/[|,]/).pop() ?? "";
    for (const candidate of [lastSegment, value]) {
        const match = NEIGHBOURHOODS.find(({ pattern }) => pattern.test(candidate));
        if (match) return match.district;
    }
    return null;
}
