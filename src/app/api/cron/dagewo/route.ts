import { Offer } from "@/components/Provider";
import { getDAGEWOOffers } from "@/utils/getDAGEWOOffers";
import { NextResponse } from "next/server";

export async function GET() {
    const data = await getDAGEWOOffers();
    return NextResponse.json({ data }) as NextResponse<{ data: Offer[] }>;
}
