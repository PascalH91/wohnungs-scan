/**
 * Email notifications for newly discovered apartment offers.
 *
 * Delivery uses Resend (https://resend.com). Configure via env:
 *   RESEND_API_KEY   - API key from the Resend dashboard
 *   NOTIFY_EMAIL_TO  - recipient address (you)
 *   NOTIFY_EMAIL_FROM- verified sender, e.g. "Wohnungs-Scan <scan@yourdomain.de>"
 *
 * If RESEND_API_KEY is unset, email sending is silently disabled so the scraper
 * keeps working locally without credentials.
 */
import { Resend } from "resend";
import { StoredOffer } from "./offerStore";
import { createLogger } from "./logger";

const logger = createLogger("email");

const API_KEY = process.env.RESEND_API_KEY;
const TO = process.env.NOTIFY_EMAIL_TO;
const FROM = process.env.NOTIFY_EMAIL_FROM || "Wohnungs-Scan <onboarding@resend.dev>";

let client: Resend | null = null;
function getClient(): Resend | null {
    if (!API_KEY) return null;
    if (!client) client = new Resend(API_KEY);
    return client;
}

export function isEmailConfigured(): boolean {
    return Boolean(API_KEY && TO);
}

function escapeHtml(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Synthetic placeholders pushed by presence-only scrapers (Berolina, EVM, …) —
// not real addresses, so they get no map link.
const NON_ADDRESSES = new Set(["", "-", "neues angebot"]);

/**
 * Build a Google Maps search link for an offer address, or null when the address
 * is a synthetic placeholder. degewo uses "Street | Neighbourhood" (commas
 * geocode better than pipes), and a trailing ", Berlin" is added when missing so
 * street-only addresses still resolve.
 */
function googleMapsLink(address: string | undefined): string | null {
    const raw = (address || "").trim();
    if (NON_ADDRESSES.has(raw.toLowerCase())) return null;

    let query = raw.replace(/\s*\|\s*/g, ", ").replace(/\s+/g, " ").trim();
    if (!/berlin/i.test(query)) query += ", Berlin";
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function renderOffer(offer: StoredOffer): string {
    const title = escapeHtml(offer.title || "Wohnungsangebot");
    const meta = [offer.rooms && `${escapeHtml(offer.rooms)} Zi.`, offer.size && `${escapeHtml(offer.size)} m²`]
        .filter(Boolean)
        .join(" · ");
    const address = offer.address ? escapeHtml(offer.address) : "";
    const mapsUrl = googleMapsLink(offer.address);
    const links = [
        offer.link
            ? `<a href="${escapeHtml(offer.link)}" style="color:#1a73e8;text-decoration:none;">Zum Angebot →</a>`
            : "",
        mapsUrl
            ? `<a href="${escapeHtml(mapsUrl)}" style="color:#1a73e8;text-decoration:none;">📍 Auf Google Maps</a>`
            : "",
    ].filter(Boolean);

    return `
        <tr>
            <td style="padding:14px 0;border-bottom:1px solid #eee;">
                <div style="font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#888;">${escapeHtml(
                    offer.company,
                )}</div>
                <div style="font-size:16px;font-weight:600;color:#111;margin:2px 0;">${title}</div>
                ${meta ? `<div style="font-size:14px;color:#444;">${meta}</div>` : ""}
                ${address ? `<div style="font-size:14px;color:#666;">${address}</div>` : ""}
                ${links.length ? `<div style="margin-top:6px;">${links.join(' &nbsp;·&nbsp; ')}</div>` : ""}
            </td>
        </tr>`;
}

function renderEmail(offers: StoredOffer[]): { subject: string; html: string; text: string } {
    const count = offers.length;
    // Highlight when any offer is in Alt-Stralau (PLZ 10245).
    const hasAltStralau = offers.some((o) => (o.address || "").includes("10245"));
    const flag = hasAltStralau ? "🏠 + 🏝️ (ALT-STRALAU): " : "🏠: ";
    const subject = `${flag}${count === 1 ? "1 neue Wohnung gefunden" : `${count} neue Wohnungen gefunden`}`;

    const rows = offers.map(renderOffer).join("");
    const html = `
        <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;">
            <h2 style="color:#111;">${flag}${count} neue${count === 1 ? "s" : ""} Angebot${count === 1 ? "" : "e"}</h2>
            <table style="width:100%;border-collapse:collapse;">${rows}</table>
            <p style="font-size:12px;color:#aaa;margin-top:24px;">Automatisch vom Wohnungs-Scan gesendet.</p>
        </div>`;

    const text = offers
        .map((o) =>
            [
                o.company,
                o.title,
                [o.rooms && `${o.rooms} Zi.`, o.size && `${o.size} m²`].filter(Boolean).join(" "),
                o.address,
                o.link,
            ]
                .filter(Boolean)
                .join(" | "),
        )
        .join("\n");

    return { subject, html, text };
}

/**
 * Send one digest email covering all freshly discovered offers. Returns true if
 * an email was dispatched, false if there was nothing to send or email is not
 * configured. Throws on a hard delivery error so the caller can decide whether
 * the offers should be re-queued.
 */
export async function sendNewOffersEmail(offers: StoredOffer[]): Promise<boolean> {
    if (!offers.length) return false;

    const resend = getClient();
    if (!resend || !TO) {
        logger.warn("Email not configured (RESEND_API_KEY / NOTIFY_EMAIL_TO missing) — skipping notification", {
            pendingOffers: offers.length,
        });
        return false;
    }

    const { subject, html, text } = renderEmail(offers);
    const { data, error } = await resend.emails.send({ from: FROM, to: TO, subject, html, text });

    if (error) {
        logger.error("Failed to send offers email", error, { offerCount: offers.length });
        throw new Error(error.message || "Resend send failed");
    }

    logger.info("Sent new offers email", { offerCount: offers.length, id: data?.id });
    return true;
}

export interface BlockedProvider {
    provider: string;
    detail: string;
}

/**
 * Alert that one or more providers returned 403/429 (blocked / rate-limited).
 * One digest email per scrape pass. Returns true if an email was dispatched.
 */
export async function sendBlockAlertEmail(blocked: BlockedProvider[]): Promise<boolean> {
    if (!blocked.length) return false;

    const resend = getClient();
    if (!resend || !TO) {
        logger.warn("Email not configured — skipping block alert", { blockedCount: blocked.length });
        return false;
    }

    const count = blocked.length;
    const subject = `⚠️ Wohnungs-Scan: ${count} Anbieter blockiert${count === 1 ? "" : " (mehrere)"}`;
    const rows = blocked
        .map(
            (b) =>
                `<li style="margin:6px 0;"><b>${escapeHtml(b.provider)}</b><br><span style="color:#666;font-size:13px;">${escapeHtml(
                    b.detail,
                )}</span></li>`,
        )
        .join("");
    const html = `
        <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;">
            <h2 style="color:#b00;">${count} Anbieter haben uns blockiert (403/429)</h2>
            <p style="color:#444;">Diese Anbieter haben mit Rate-Limit/Sperre geantwortet. Sie werden für die
            Abkühlphase übersprungen. Bei dauerhafter Sperre ggf. einen Proxy für den Anbieter erwägen.</p>
            <ul style="padding-left:18px;">${rows}</ul>
        </div>`;
    const text = blocked.map((b) => `${b.provider}: ${b.detail}`).join("\n");

    const { data, error } = await resend.emails.send({ from: FROM, to: TO, subject, html, text });
    if (error) {
        logger.error("Failed to send block alert email", error, { blockedCount: count });
        throw new Error(error.message || "Resend send failed");
    }

    logger.info("Sent block alert email", { blockedCount: count, id: data?.id });
    return true;
}

export interface HealthIssue {
    provider: string;
    /** SUSPECT (looks broken now) or STALE (was working, has gone silently empty). */
    kind: "SUSPECT" | "STALE";
    reasons: string[];
}

/**
 * Alert that one or more providers look broken rather than genuinely empty — a
 * changed DOM, a moved URL, mangled fields, or a previously-working scraper that
 * has returned nothing for too long. One digest per scrape pass.
 */
export async function sendHealthAlertEmail(issues: HealthIssue[]): Promise<boolean> {
    if (!issues.length) return false;

    const resend = getClient();
    if (!resend || !TO) {
        logger.warn("Email not configured — skipping health alert", { issueCount: issues.length });
        return false;
    }

    const count = issues.length;
    const subject = `🛠️ Wohnungs-Scan: ${count} Scraper prüfen${count === 1 ? "" : " (mehrere)"}`;
    const rows = issues
        .map((issue) => {
            const label = issue.kind === "STALE" ? "Seit Längerem leer" : "Sieht kaputt aus";
            const reasonList = issue.reasons
                .map((r) => `<li style="color:#666;font-size:13px;margin:2px 0;">${escapeHtml(r)}</li>`)
                .join("");
            return `<li style="margin:10px 0;"><b>${escapeHtml(issue.provider)}</b>
                <span style="font-size:12px;color:#b00;">— ${label}</span>
                <ul style="padding-left:18px;margin:4px 0;">${reasonList}</ul></li>`;
        })
        .join("");
    const html = `
        <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;">
            <h2 style="color:#b00;">${count} Scraper brauchen einen Blick</h2>
            <p style="color:#444;">Diese Anbieter lieferten 0 Ergebnisse aus einem verdächtigen Grund (geändertes
            DOM, umgezogene URL, kaputte Felder) oder sind seit Längerem leer, obwohl sie früher Treffer hatten.
            Bitte Selektoren/URL prüfen.</p>
            <ul style="padding-left:18px;">${rows}</ul>
        </div>`;
    const text = issues
        .map((i) => `${i.provider} [${i.kind}]: ${i.reasons.join("; ")}`)
        .join("\n");

    const { data, error } = await resend.emails.send({ from: FROM, to: TO, subject, html, text });
    if (error) {
        logger.error("Failed to send health alert email", error, { issueCount: count });
        throw new Error(error.message || "Resend send failed");
    }

    logger.info("Sent health alert email", { issueCount: count, id: data?.id });
    return true;
}
