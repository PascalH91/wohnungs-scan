/**
 * Monthly report of all seen offers, emailed as two Markdown attachments:
 *   - the offers first seen in the previous calendar month
 *   - every offer ever seen
 *
 * Structure of each file: chapters by WBS (ja/nein) → sub-chapters by district
 * (Bezirk), each with its offer count → one line per offer, sorted by rooms
 * (most first), then company (state-owned "landeseigene" first, then A–Z).
 * Markdown keeps the files tiny (~100 bytes per offer) and readable anywhere.
 *
 * Driven by the scheduler, which calls /api/report every cycle; the report for
 * a month is sent once (tracked in data/report-state.json, survives restarts).
 */
import { promises as fs } from "fs";
import path from "path";
import { readAllOffers, StoredOffer } from "./offerStore";
import { districtFromAddress } from "./berlinDistricts";
import { titleIndicatesWbs } from "./titleContainsDisqualifyingPattern";
import { isEmailConfigured, sendMonthlyReportEmail } from "./email";
import { createLogger } from "./logger";

const logger = createLogger("monthly-report");

const STATE_PATH = path.join(process.cwd(), "data", "report-state.json");
const TZ = "Europe/Berlin";
const MISSING = "-";
const UNKNOWN_DISTRICT = "Unbekannt / außerhalb Berlins";

// Berlin's state-owned housing companies (landeseigene Wohnungsunternehmen),
// keyed by scraper providerName. Listed first within each room-count cluster.
const STATE_OWNED = new Set(["DAGEWO", "GESOBAU", "GEWOBAG", "HOWOGE", "Stadt und Land", "WBM", "Berlinovo"]);

// Synthetic placeholders pushed by sentinel scrapers — not real addresses.
const NON_ADDRESSES = new Set(["", "-", "neues angebot"]);

interface ReportRow {
    rooms: number | null;
    size: number | null;
    price: string;
    address: string;
    company: string;
    firstSeenAt: string;
    wbs: boolean;
    district: string;
}

/** First number in a scraped string ("• 4,00 Zimmer", "89 m²"), or null. */
function parseNumber(value: string | undefined, max: number): number | null {
    const match = (value ?? "").match(/\d+(?:[.,]\d+)?/);
    if (!match) return null;
    const number = parseFloat(match[0].replace(",", "."));
    // 0 = sentinel placeholder; absurd values = mangled fields.
    return number > 0 && number <= max ? number : null;
}

const numberFormat = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });
const dateFormat = new Intl.DateTimeFormat("de-DE", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
});
// "Mo., 07.06.2026" — weekday in front of the first-seen date of each row.
const seenDateFormat = new Intl.DateTimeFormat("de-DE", {
    timeZone: TZ,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
});
const monthNameFormat = new Intl.DateTimeFormat("de-DE", { timeZone: TZ, month: "long", year: "numeric" });

/** "YYYY-MM" of a date in Berlin time. */
function monthKey(date: Date): string {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit" }).formatToParts(
        date,
    );
    const get = (type: string) => parts.find((p) => p.type === type)?.value;
    return `${get("year")}-${get("month")}`;
}

function previousMonthKey(now: Date): string {
    const [year, month] = monthKey(now).split("-").map(Number);
    return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
}

function toRow(offer: StoredOffer): ReportRow {
    const rawAddress = (offer.address ?? "")
        .replace(/\s*\|\s*/g, ", ")
        .replace(/\s+/g, " ")
        .trim();
    return {
        rooms: parseNumber(offer.rooms, 15),
        size: parseNumber(offer.size, 1000),
        price: offer.price || MISSING,
        address: NON_ADDRESSES.has(rawAddress.toLowerCase()) ? MISSING : rawAddress,
        company: offer.company || MISSING,
        firstSeenAt: offer.firstSeenAt,
        wbs: offer.wbs ?? titleIndicatesWbs(offer.title),
        district: districtFromAddress(offer.address) ?? UNKNOWN_DISTRICT,
    };
}

function compareRows(a: ReportRow, b: ReportRow): number {
    return (
        (b.rooms ?? -1) - (a.rooms ?? -1) ||
        Number(STATE_OWNED.has(b.company)) - Number(STATE_OWNED.has(a.company)) ||
        a.company.localeCompare(b.company, "de") ||
        (b.size ?? -1) - (a.size ?? -1) ||
        a.address.localeCompare(b.address, "de")
    );
}

function renderRow(row: ReportRow): string {
    const rooms = row.rooms !== null ? `${numberFormat.format(row.rooms)} Zi.` : MISSING;
    const size = row.size !== null ? `${numberFormat.format(row.size)} m²` : MISSING;
    const seen = row.firstSeenAt ? seenDateFormat.format(new Date(row.firstSeenAt)) : MISSING;
    return `- ${rooms} | ${size} | ${row.price} | ${row.address} | ${row.company} | ${seen}`;
}

function renderReport(title: string, subtitle: string, offers: StoredOffer[], now: Date): string {
    const rows = offers.map(toRow);
    const lines = [
        `# ${title}`,
        "",
        `${subtitle} · ${rows.length} Angebote · erstellt ${dateFormat.format(now)}`,
        "",
        "Format: Zimmer | Größe | Miete | Adresse | Anbieter | zuerst gesehen",
    ];

    for (const wbs of [true, false]) {
        const inGroup = rows.filter((row) => row.wbs === wbs);
        lines.push("", `## WBS: ${wbs ? "ja" : "nein"} (${inGroup.length})`);

        const districts = Array.from(new Set(inGroup.map((row) => row.district))).sort((a, b) =>
            a === UNKNOWN_DISTRICT ? 1 : b === UNKNOWN_DISTRICT ? -1 : a.localeCompare(b, "de"),
        );
        for (const district of districts) {
            const inDistrict = inGroup.filter((row) => row.district === district).sort(compareRows);
            lines.push("", `### ${district} (${inDistrict.length})`, "", ...inDistrict.map(renderRow));
        }
    }

    return lines.join("\n") + "\n";
}

export interface MonthlyReport {
    month: string;
    monthLabel: string;
    monthCount: number;
    totalCount: number;
    files: { filename: string; content: string }[];
}

export async function buildMonthlyReport(now = new Date()): Promise<MonthlyReport> {
    const month = previousMonthKey(now);
    const [year, monthNumber] = month.split("-").map(Number);
    const monthLabel = monthNameFormat.format(new Date(Date.UTC(year, monthNumber - 1, 15)));

    const all = await readAllOffers();
    const inMonth = all.filter((offer) => offer.firstSeenAt && monthKey(new Date(offer.firstSeenAt)) === month);
    const today = now.toISOString().slice(0, 10);

    return {
        month,
        monthLabel,
        monthCount: inMonth.length,
        totalCount: all.length,
        files: [
            {
                filename: `wohnungen_${month}.md`,
                content: renderReport(`Wohnungs-Scan – ${monthLabel}`, `Zuerst gesehen im ${monthLabel}`, inMonth, now),
            },
            {
                filename: `wohnungen_alle_stand_${today}.md`,
                content: renderReport("Wohnungs-Scan – alle Angebote", "Alle bisher gesehenen Angebote", all, now),
            },
        ],
    };
}

async function readLastSentMonth(): Promise<string | null> {
    try {
        const state = JSON.parse(await fs.readFile(STATE_PATH, "utf8")) as { lastSentMonth?: string };
        return state.lastSentMonth ?? null;
    } catch {
        return null;
    }
}

async function writeLastSentMonth(month: string): Promise<void> {
    await fs.mkdir(path.dirname(STATE_PATH), { recursive: true });
    await fs.writeFile(STATE_PATH, JSON.stringify({ lastSentMonth: month }, null, 2), "utf8");
}

/**
 * Send the previous month's report unless it already went out. `force` sends
 * regardless and leaves the state untouched (manual/test runs).
 */
export async function runMonthlyReport({ force = false } = {}): Promise<{ sent: boolean; month: string }> {
    const month = previousMonthKey(new Date());
    if (!force && (await readLastSentMonth()) === month) return { sent: false, month };

    if (!isEmailConfigured()) {
        logger.warn("Email not configured — skipping monthly report", { month });
        return { sent: false, month };
    }

    const report = await buildMonthlyReport();
    await sendMonthlyReportEmail(report);
    if (!force) await writeLastSentMonth(month);

    logger.info("Sent monthly report", { month, monthCount: report.monthCount, totalCount: report.totalCount });
    return { sent: true, month };
}
