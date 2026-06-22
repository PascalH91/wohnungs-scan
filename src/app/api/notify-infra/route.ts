// Internal endpoint driven by the scheduler. Emails one alert when a large share
// of providers failed in a single cycle for non-block reasons — a systemic
// problem (browser-pool exhaustion, server overload, network) rather than one
// site changing. Lives as a route handler so its Resend import resolves in the
// server runtime, like /api/notify, /api/notify-block and /api/notify-health.
//
// POST /api/notify-infra  body: { failures: [{ provider, error }], attempted }
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { sendInfraAlertEmail, InfraFailure } from "@/utils/email";
import { createLogger } from "@/utils/logger";

const logger = createLogger("notify-infra-route");

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body = (await request.json()) as { failures?: InfraFailure[]; attempted?: number };
        const failures = Array.isArray(body?.failures) ? body.failures : [];
        const attempted = body?.attempted ?? failures.length;
        const emailed = await sendInfraAlertEmail(failures, attempted);
        return NextResponse.json({ emailed, failed: failures.length, attempted });
    } catch (error: any) {
        logger.error("Notify-infra route failed", error);
        return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
    }
}
