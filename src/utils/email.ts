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
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function renderOffer(offer: StoredOffer): string {
    const title = escapeHtml(offer.title || "Wohnungsangebot");
    const meta = [offer.rooms && `${escapeHtml(offer.rooms)} Zi.`, offer.size && `${escapeHtml(offer.size)} m²`]
        .filter(Boolean)
        .join(" · ");
    const address = offer.address ? escapeHtml(offer.address) : "";
    const link = offer.link
        ? `<a href="${escapeHtml(offer.link)}" style="color:#1a73e8;text-decoration:none;">Zum Angebot →</a>`
        : "";

    return `
        <tr>
            <td style="padding:14px 0;border-bottom:1px solid #eee;">
                <div style="font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#888;">${escapeHtml(
                    offer.company,
                )}</div>
                <div style="font-size:16px;font-weight:600;color:#111;margin:2px 0;">${title}</div>
                ${meta ? `<div style="font-size:14px;color:#444;">${meta}</div>` : ""}
                ${address ? `<div style="font-size:14px;color:#666;">${address}</div>` : ""}
                ${link ? `<div style="margin-top:6px;">${link}</div>` : ""}
            </td>
        </tr>`;
}

function renderEmail(offers: StoredOffer[]): { subject: string; html: string; text: string } {
    const count = offers.length;
    const subject = count === 1 ? "🏠 1 neue Wohnung gefunden" : `🏠 ${count} neue Wohnungen gefunden`;

    const rows = offers.map(renderOffer).join("");
    const html = `
        <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;">
            <h2 style="color:#111;">${count} neue${count === 1 ? "s" : ""} Angebot${count === 1 ? "" : "e"}</h2>
            <table style="width:100%;border-collapse:collapse;">${rows}</table>
            <p style="font-size:12px;color:#aaa;margin-top:24px;">Automatisch vom Wohnungs-Scan gesendet.</p>
        </div>`;

    const text = offers
        .map((o) =>
            [o.company, o.title, [o.rooms && `${o.rooms} Zi.`, o.size && `${o.size} m²`].filter(Boolean).join(" "), o.address, o.link]
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
