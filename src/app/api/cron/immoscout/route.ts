import { Offer } from "@/components/Provider";
import { getIMMOSCOUTOffers } from "@/utils/getIMMOSCOUTOffers";
import { NextResponse } from "next/server";

export async function GET() {
    const data = await getIMMOSCOUTOffers();
    return NextResponse.json(data) as NextResponse<{ data: Offer[]; errors: string }>;
}
