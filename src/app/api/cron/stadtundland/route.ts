import { Offer } from "@/components/Provider/Provider";
import { getSTADTUNDLANDOffers } from "@/utils/getSTADTUNDLANDOffers";
import { NextResponse } from "next/server";

export async function GET() {
    const data = await getSTADTUNDLANDOffers();
    return NextResponse.json({ data }) as NextResponse<{ data: Offer[] }>;
}
