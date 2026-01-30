import { ScraperResponse } from "@/types";
import { getParadiesOffers } from "@/utils/getParadiesOffers";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<ScraperResponse>> {
    const data = await getParadiesOffers();
    return NextResponse.json(data);
}
