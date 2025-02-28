import { Offer } from "@/components/Provider";
import { getWBMOffers } from "@/utils/getWBMOffers";
import { NextResponse } from "next/server";

export async function GET() {
    const data = await getWBMOffers();
    return NextResponse.json(data) as NextResponse<{ data: Offer[]; errors: string }>;
}
