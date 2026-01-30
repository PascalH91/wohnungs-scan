import { ScraperResponse } from "@/types";
import { getWGVorwaertsOffers } from "@/utils/getWGVorwaertsOffers";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<ScraperResponse>> {
    const data = await getWGVorwaertsOffers();
    return NextResponse.json(data);
}
