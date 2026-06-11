// Internal endpoint driven by the scheduler. Inspects the per-provider scrape
// snapshots and emails a digest of providers that look BROKEN rather than
// genuinely empty — a changed DOM / moved URL / mangled fields (health=SUSPECT),
// or a provider that used to return listings but has been empty for too long
// (the time-based baseline). Lives as a route handler so its fs/Resend imports
// resolve in the server runtime, like /api/notify and /api/notify-block.
//
// GET /api/notify-health → assess snapshots, email a digest, return a summary.
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAllSnapshots, markHealthAlerted } from "@/utils/offerStore";
import { sendHealthAlertEmail, HealthIssue } from "@/utils/email";
import { createLogger } from "@/utils/logger";
import { config } from "@/config";

const logger = createLogger("notify-health-route");

export async function GET(): Promise<NextResponse> {
    try {
        const snapshots = await getAllSnapshots();
        const now = Date.now();
        const staleMs = config.health.staleEmptyHours * 60 * 60 * 1000;
        const throttleMs = config.health.alertThrottleHours * 60 * 60 * 1000;

        const issues: HealthIssue[] = [];

        for (const [provider, snap] of Object.entries(snapshots)) {
            // Respect the per-provider alert throttle.
            const alertedAt = snap.healthAlertedAt ? Date.parse(snap.healthAlertedAt) : 0;
            const throttled = alertedAt && now - alertedAt < throttleMs;
            if (throttled) continue;

            const status = snap.health?.status;

            // 1. Looks broken right now.
            if (status === "SUSPECT") {
                issues.push({ provider, kind: "SUSPECT", reasons: snap.health?.reasons ?? [] });
                continue;
            }

            // 2. Was working before but has shown zero listing cards for too long.
            //    Opt-in only (health.baselineEmpty) and only for providers with a
            //    known history — the strict size/room filter makes "empty" normal
            //    for most providers, so we baseline only the always-stocked ones.
            const emptyNow = status === "EMPTY_OK" || status === "UNKNOWN";
            if (emptyNow && snap.health?.baselineEligible && snap.lastNonEmptyAt) {
                const sinceNonEmpty = now - Date.parse(snap.lastNonEmptyAt);
                if (sinceNonEmpty > staleMs) {
                    const days = Math.floor(sinceNonEmpty / (24 * 60 * 60 * 1000));
                    issues.push({
                        provider,
                        kind: "STALE",
                        reasons: [
                            `keine Einträge mehr seit ${days} Tag(en) (zuletzt: ${snap.lastNonEmptyAt}), obwohl der Anbieter früher Treffer hatte`,
                        ],
                    });
                }
            }
        }

        let emailed = false;
        if (issues.length) {
            emailed = await sendHealthAlertEmail(issues);
            await markHealthAlerted(issues.map((i) => i.provider));
        }

        logger.info("Health check complete", { issues: issues.length, emailed });
        return NextResponse.json({ issues: issues.length, emailed, providers: issues.map((i) => i.provider) });
    } catch (error: any) {
        logger.error("Notify-health route failed", error);
        return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
    }
}
