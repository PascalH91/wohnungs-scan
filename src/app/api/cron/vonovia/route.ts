import { ScraperResponse } from "@/types";
import { getVonoviaOffers } from "@/utils/getVonoviaOffers";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<ScraperResponse>> {
    const data = await getVonoviaOffers();
    return NextResponse.json(data);
}
