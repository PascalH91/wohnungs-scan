import { Offer } from "@/components/Provider";
import { getBerlinovoOffers } from "@/utils/getBerlinovoOffers";
import { NextResponse } from "next/server";

export async function GET() {
    const data = await getBerlinovoOffers();
    return NextResponse.json(data) as NextResponse<{ data: Offer[]; errors: string }>;
}
