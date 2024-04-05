import { Offer } from "@/components/provider/GEWOBAG/GEWOBAG";
import { getFRIEDRICHSHEIMOffers } from "@/utils/getFRIEDRICHSHEIMOffers";
import { NextResponse } from "next/server";

export async function GET() {
    const data = await getFRIEDRICHSHEIMOffers();
    return NextResponse.json({ data }) as NextResponse<{ data: Offer[] }>;
}
