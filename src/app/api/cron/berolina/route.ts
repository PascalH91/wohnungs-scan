import { ScraperResponse } from "@/types";
import { getBerolinaOffers } from "@/utils/getBerolinaOffers";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<ScraperResponse>> {
    const data = await getBerolinaOffers();
    return NextResponse.json(data);
}
