import { ScraperResponse } from "@/types";
import { getFRIEDRICHSHEIMOffers } from "@/utils/getFRIEDRICHSHEIMOffers";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<ScraperResponse>> {
    const data = await getFRIEDRICHSHEIMOffers();
    return NextResponse.json(data);
}
