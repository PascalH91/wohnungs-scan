// Force dynamic rendering - prevent static generation during build
export const dynamic = "force-dynamic";

import { ScraperResponse } from "@/types";
import { getSTADTUNDLANDOffers } from "@/utils/getSTADTUNDLANDOffers";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<ScraperResponse>> {
    const data = await getSTADTUNDLANDOffers();
    return NextResponse.json(data);
}
