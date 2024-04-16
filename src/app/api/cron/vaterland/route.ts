import { Offer } from "@/components/Provider";
import { getVaterlandOffers } from "@/utils/getVaterlandOffers";
import { NextResponse } from "next/server";

export async function GET() {
    const data = await getVaterlandOffers();
    return NextResponse.json(data) as NextResponse<{ data: Offer[]; errors: string }>;
}
