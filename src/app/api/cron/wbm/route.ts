import { ScraperResponse } from "@/types";
import { getWBMOffers } from "@/utils/getWBMOffers";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<ScraperResponse>> {
    const data = await getWBMOffers();
    return NextResponse.json(data);
}
