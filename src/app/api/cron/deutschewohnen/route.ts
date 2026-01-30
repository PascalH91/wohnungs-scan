// Force dynamic rendering - prevent static generation during build
export const dynamic = "force-dynamic";

import { getDEUTSCHEWOHNENOffers } from "@/utils/getDEUTSCHEWOHNENOffers";
import { ScraperResponse } from "@/types";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<ScraperResponse>> {
    const data = await getDEUTSCHEWOHNENOffers();
    return NextResponse.json(data);
}
