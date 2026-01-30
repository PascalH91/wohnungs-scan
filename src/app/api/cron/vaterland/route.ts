import { ScraperResponse } from "@/types";
import { getVaterlandOffers } from "@/utils/getVaterlandOffers";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<ScraperResponse>> {
    const data = await getVaterlandOffers();
    return NextResponse.json(data);
}
