// Force dynamic rendering - prevent static generation during build
export const dynamic = "force-dynamic";

import { ScraperResponse } from "@/types";
import { getEbayKleinanzeigenOffers } from "@/utils/getEbayKleinanzeigenOffers";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<ScraperResponse>> {
    const data = await getEbayKleinanzeigenOffers();
    return NextResponse.json(data);
}
