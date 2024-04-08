import { Offer } from "@/components/Provider";
import { getHOWOGEOffers } from "@/utils/getHOWOGEOffers";
import { NextResponse } from "next/server";

export async function GET() {
    const data = await getHOWOGEOffers();
    return NextResponse.json(data) as NextResponse<{ data: Offer[]; errors: string }>;
}
