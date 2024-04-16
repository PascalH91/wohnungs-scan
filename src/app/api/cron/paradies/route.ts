import { Offer } from "@/components/Provider";
import { getParadiesOffers } from "@/utils/getParadiesOffers";
import { NextResponse } from "next/server";

export async function GET() {
    const data = await getParadiesOffers();
    return NextResponse.json(data) as NextResponse<{ data: Offer[]; errors: string }>;
}
