import { Offer } from "@/components/Provider";
import { getADLERGROUPOffers } from "@/utils/getADLERGROUPOffers";
import { NextResponse } from "next/server";

export async function GET() {
    const data = await getADLERGROUPOffers();
    return NextResponse.json(data) as NextResponse<{ data: Offer[]; errors: string }>;
}
