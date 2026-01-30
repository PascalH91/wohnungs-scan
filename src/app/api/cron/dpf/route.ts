import { ScraperResponse } from "@/types";
import { getDPFOffers } from "@/utils/getDPFOffers";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<ScraperResponse>> {
    const data = await getDPFOffers();
    return NextResponse.json(data);
}
