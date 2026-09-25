// Force dynamic rendering - prevent static generation during build
export const dynamic = "force-dynamic";

import { ScraperResponse } from "@/types";
import { getEWGPankowOffers } from "@/utils/getEWGPankowOffers";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<ScraperResponse>> {
    const data = await getEWGPankowOffers();
    return NextResponse.json(data);
}
