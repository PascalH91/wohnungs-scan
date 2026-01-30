// Force dynamic rendering - prevent static generation during build
export const dynamic = "force-dynamic";

import { ScraperResponse } from "@/types";
import { getGEWOBAGOffers } from "@/utils/getGEWOBAGOffers";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<ScraperResponse>> {
    const data = await getGEWOBAGOffers();
    return NextResponse.json(data);
}
