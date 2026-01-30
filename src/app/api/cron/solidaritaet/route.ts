import { ScraperResponse } from "@/types";
import { getSolidaritaetOffers } from "@/utils/getSolidaritaetOffers";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<ScraperResponse>> {
    const data = await getSolidaritaetOffers();
    return NextResponse.json(data);
}
