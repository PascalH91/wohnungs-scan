import { Offer } from "@/components/Provider/Provider";
import { getDEUTSCHEWOHNENOffers } from "@/utils/getDEUTSCHEWOHNENOffers";
import { NextResponse } from "next/server";

export async function GET() {
    const data = await getDEUTSCHEWOHNENOffers();
    return NextResponse.json({ data }) as NextResponse<{ data: Offer[] }>;
}
