import { Offer } from "@/components/Provider";
import { getVonoviaOffers } from "@/utils/getVonoviaOffers";
import { NextResponse } from "next/server";

export async function GET() {
    const data = await getVonoviaOffers();
    return NextResponse.json(data) as NextResponse<{ data: Offer[]; errors: string }>;
}
