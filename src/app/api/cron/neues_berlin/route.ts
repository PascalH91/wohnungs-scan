import { Offer } from "@/components/Provider";
import { getNeuesBerlinOffers } from "@/utils/getNeuesBerlinOffers";
import { NextResponse } from "next/server";

export async function GET() {
    const data = await getNeuesBerlinOffers();
    return NextResponse.json(data) as NextResponse<{ data: Offer[]; errors: string }>;
}
