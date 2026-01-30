import { ScraperResponse } from "@/types";
import { getEVMOffers } from "@/utils/getEVMOffers";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<ScraperResponse>> {
    const data = await getEVMOffers();
    return NextResponse.json(data);
}
