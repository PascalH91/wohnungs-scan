// Read-only endpoint for the frontend. Returns a provider's CURRENT listing
// straight from the snapshot store — no scraping, no browser launch. The
// scheduler is the only thing that scrapes; the UI just displays its results.
//
// GET /api/offers?provider=<scraper providerName>  e.g. ?provider=Deutsche%20Wohnen
//
// Response intentionally mirrors the old /api/cron/* shape (ScraperResponse) so
// the frontend's offer/sound/new-highlight logic works unchanged.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ScraperResponse } from "@/types";
import { getProviderSnapshot } from "@/utils/offerStore";

export async function GET(request: NextRequest): Promise<NextResponse<ScraperResponse>> {
    const provider = request.nextUrl.searchParams.get("provider");
    if (!provider) {
        return NextResponse.json({ data: { offers: [], isMultiPages: false }, errors: "Missing 'provider' query param" });
    }

    const snapshot = await getProviderSnapshot(provider);
    if (!snapshot) {
        // Never scraped yet (e.g. server just started) — empty, no error.
        return NextResponse.json({ data: { offers: [], isMultiPages: false }, errors: "" });
    }

    return NextResponse.json({
        data: { offers: snapshot.offers, isMultiPages: snapshot.isMultiPages },
        errors: snapshot.error,
    });
}
