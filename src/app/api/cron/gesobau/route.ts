import { Offer } from "@/components/Provider";
import { getGESOBAUOffers } from "@/utils/getGESOBAUOffers";
import { NextResponse } from "next/server";

export async function GET() {
    const data = await getGESOBAUOffers();
    return NextResponse.json(data) as NextResponse<{ data: Offer[]; errors: string }>;
}
