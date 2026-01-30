import { ScraperResponse } from "@/types";
import { getIMMOSCOUTOffers } from "@/utils/getIMMOSCOUTOffers";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<ScraperResponse>> {
    const data = await getIMMOSCOUTOffers();
    return NextResponse.json(data);
}
