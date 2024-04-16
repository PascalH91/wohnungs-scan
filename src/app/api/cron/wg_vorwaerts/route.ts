import { Offer } from "@/components/Provider";
import { getWGVorwaertsOffers } from "@/utils/getWGVorwaertsOffers";
import { NextResponse } from "next/server";

export async function GET() {
    const data = await getWGVorwaertsOffers();
    return NextResponse.json(data) as NextResponse<{ data: Offer[]; errors: string }>;
}
