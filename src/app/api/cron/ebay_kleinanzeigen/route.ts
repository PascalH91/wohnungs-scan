import { Offer } from "@/components/Provider";
import { getEbayKleinanzeigenOffers } from "@/utils/getEbayKleinanzeigenOffers";
import { NextResponse } from "next/server";

export async function GET() {
    const data = await getEbayKleinanzeigenOffers();
    return NextResponse.json(data) as NextResponse<{ data: Offer[]; errors: string }>;
}
