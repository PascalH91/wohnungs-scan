// Internal endpoint driven by the background scheduler: emails last month's
// report (see utils/monthlyReport) once per month.
//
// GET /api/report          → send last month's report if not sent yet
// GET /api/report?force=1  → send it now, even if already sent (manual/test)
// GET /api/report?preview=1 → return the report files as JSON, send nothing
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { buildMonthlyReport, runMonthlyReport } from "@/utils/monthlyReport";
import { createLogger } from "@/utils/logger";

const logger = createLogger("report-route");

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const params = request.nextUrl.searchParams;
        if (params.get("preview") === "1") {
            return NextResponse.json(await buildMonthlyReport());
        }
        return NextResponse.json(await runMonthlyReport({ force: params.get("force") === "1" }));
    } catch (error: any) {
        logger.error("Report route failed", error);
        return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
    }
}
