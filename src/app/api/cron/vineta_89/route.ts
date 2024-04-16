import { Offer } from "@/components/Provider";
import { getVineta89Offers } from "@/utils/getVineta89Offers";
import { NextResponse } from "next/server";

export async function GET() {
    const data = await getVineta89Offers();
    return NextResponse.json(data) as NextResponse<{ data: Offer[]; errors: string }>;
}
