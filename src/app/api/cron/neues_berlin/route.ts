// Force dynamic rendering - prevent static generation during build
export const dynamic = "force-dynamic";

import { ScraperResponse } from "@/types";
import { getNeuesBerlinOffers } from "@/utils/getNeuesBerlinOffers";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<ScraperResponse>> {
    const data = await getNeuesBerlinOffers();
    return NextResponse.json(data);
}
