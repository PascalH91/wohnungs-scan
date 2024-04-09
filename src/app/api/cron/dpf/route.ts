import { Offer } from "@/components/Provider";
import { getDPFOffers } from "@/utils/getDPFOffers";
import { NextResponse } from "next/server";

export async function GET() {
    const data = await getDPFOffers();
    return NextResponse.json(data) as NextResponse<{ data: Offer[]; errors: string }>;
}
