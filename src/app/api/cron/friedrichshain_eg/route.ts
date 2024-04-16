import { Offer } from "@/components/Provider";
import { getFriedrichshainEGOffers } from "@/utils/getFriedrichshainEGOffers";
import { NextResponse } from "next/server";

export async function GET() {
    const data = await getFriedrichshainEGOffers();
    return NextResponse.json(data) as NextResponse<{ data: Offer[]; errors: string }>;
}
