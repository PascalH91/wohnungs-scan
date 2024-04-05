import { Offer } from "@/components/provider/GEWOBAG/GEWOBAG";
import { getGEWOBAGOffers } from "@/utils/getGEWOBAGOffers";
import { NextResponse } from "next/server";

export async function GET() {
    const data = await getGEWOBAGOffers();
    return NextResponse.json({ data }) as NextResponse<{ data: Offer[] }>;
}
