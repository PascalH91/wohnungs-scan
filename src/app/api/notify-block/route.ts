// Internal endpoint driven by the scheduler. Emails an alert when providers
// return 403/429. Lives as a route handler (not in the scheduler module) so its
// Resend import is bundled in the server runtime where it resolves.
//
// POST /api/notify-block  body: { blocked: [{ provider, detail }] }
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { sendBlockAlertEmail, BlockedProvider } from "@/utils/email";
import { createLogger } from "@/utils/logger";

const logger = createLogger("notify-block-route");

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body = (await request.json()) as { blocked?: BlockedProvider[] };
        const blocked = Array.isArray(body?.blocked) ? body.blocked : [];
        const emailed = await sendBlockAlertEmail(blocked);
        return NextResponse.json({ emailed, count: blocked.length });
    } catch (error: any) {
        logger.error("Notify-block route failed", error);
        return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
    }
}
