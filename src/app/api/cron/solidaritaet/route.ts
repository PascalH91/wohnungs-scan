import { Offer } from "@/components/Provider";
import { getSolidaritaetOffers } from "@/utils/getSolidaritaetOffers";
import { NextResponse } from "next/server";

export async function GET() {
    const data = await getSolidaritaetOffers();
    return NextResponse.json(data) as NextResponse<{ data: Offer[]; errors: string }>;
}
