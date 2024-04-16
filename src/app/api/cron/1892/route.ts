import { Offer } from "@/components/Provider";
import { get1892Offers } from "@/utils/get1892Offers";
import { NextResponse } from "next/server";

export async function GET() {
    const data = await get1892Offers();
    return NextResponse.json(data) as NextResponse<{ data: Offer[]; errors: string }>;
}
