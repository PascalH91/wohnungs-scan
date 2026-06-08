// Internal endpoint driven by the background scheduler. It claims offers that
// have not yet been notified and emails a single digest. Lives as a route
// handler (not in the scheduler module) so its fs/crypto/Resend imports are
// bundled in the server runtime where they resolve — the same place the
// /api/cron/* scrapers already run.
//
// GET /api/notify           → claim unnotified offers and email a digest
// GET /api/notify?backfill=1 → mark all existing offers notified, send nothing
//                              (used once on startup to suppress the backlog)
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { claimUnnotifiedOffers, markAllNotified } from "@/utils/offerStore";
import { sendNewOffersEmail } from "@/utils/email";
import { createLogger } from "@/utils/logger";

const logger = createLogger("notify-route");

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        if (request.nextUrl.searchParams.get("backfill") === "1") {
            const marked = await markAllNotified();
            return NextResponse.json({ backfilled: marked });
        }

        const fresh = await claimUnnotifiedOffers();
        let emailed = false;
        if (fresh.length) {
            emailed = await sendNewOffersEmail(fresh);
        }
        return NextResponse.json({ newOffers: fresh.length, emailed });
    } catch (error: any) {
        logger.error("Notify route failed", error);
        return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
    }
}
