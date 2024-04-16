import { Offer } from "@/components/Provider";
import { getEVMOffers } from "@/utils/getEVMOffers";
import { NextResponse } from "next/server";

export async function GET() {
    const data = await getEVMOffers();
    return NextResponse.json(data) as NextResponse<{ data: Offer[]; errors: string }>;
}
