import { ScraperResponse } from "@/types";
import { getDAGEWOOffers } from "@/utils/getDAGEWOOffers";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<ScraperResponse>> {
    const data = await getDAGEWOOffers();
    return NextResponse.json(data);
}
