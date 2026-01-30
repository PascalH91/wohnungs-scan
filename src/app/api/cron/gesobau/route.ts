// Force dynamic rendering - prevent static generation during build
export const dynamic = "force-dynamic";

import { ScraperResponse } from "@/types";
import { getGESOBAUOffers } from "@/utils/getGESOBAUOffers";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<ScraperResponse>> {
    const data = await getGESOBAUOffers();
    return NextResponse.json(data);
}
