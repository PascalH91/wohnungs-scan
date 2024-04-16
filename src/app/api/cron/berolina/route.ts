import { Offer } from "@/components/Provider";
import { getBerolinaOffers } from "@/utils/getBerolinaOffers";
import { NextResponse } from "next/server";

export async function GET() {
    const data = await getBerolinaOffers();
    return NextResponse.json(data) as NextResponse<{ data: Offer[]; errors: string }>;
}
