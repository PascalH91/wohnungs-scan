import { ScraperResponse } from "@/types";
import { getHOWOGEOffers } from "@/utils/getHOWOGEOffers";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<ScraperResponse>> {
    const data = await getHOWOGEOffers();
    return NextResponse.json(data);
}
