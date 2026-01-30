// Force dynamic rendering - prevent static generation during build
export const dynamic = "force-dynamic";

import { ScraperResponse } from "@/types";
import { getWBMOffers } from "@/utils/getWBMOffers";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<ScraperResponse>> {
    const data = await getWBMOffers();
    return NextResponse.json(data);
}
