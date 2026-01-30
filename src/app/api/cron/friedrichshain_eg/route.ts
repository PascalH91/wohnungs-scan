import { ScraperResponse } from "@/types";
import { getFriedrichshainEGOffers } from "@/utils/getFriedrichshainEGOffers";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<ScraperResponse>> {
    const data = await getFriedrichshainEGOffers();
    return NextResponse.json(data);
}
