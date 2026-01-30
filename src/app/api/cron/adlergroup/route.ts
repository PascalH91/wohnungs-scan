// Force dynamic rendering - prevent static generation during build
export const dynamic = "force-dynamic";

import { ScraperResponse } from "@/types";
import { getADLERGROUPOffers } from "@/utils/getADLERGROUPOffers";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<ScraperResponse>> {
    const data = await getADLERGROUPOffers();
    return NextResponse.json(data);
}
