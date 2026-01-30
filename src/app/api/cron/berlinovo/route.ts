import { ScraperResponse } from "@/types";
import { getBerlinovoOffers } from "@/utils/getBerlinovoOffers";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<ScraperResponse>> {
    const data = await getBerlinovoOffers();
    return NextResponse.json(data);
}
