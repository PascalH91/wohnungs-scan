import { ScraperResponse } from "@/types";
import { getForumKreuzbergOffers } from "@/utils/getForumKreuzbergOffers";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<ScraperResponse>> {
    const data = await getForumKreuzbergOffers();
    return NextResponse.json(data);
}
