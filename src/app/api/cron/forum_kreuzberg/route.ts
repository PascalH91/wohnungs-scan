import { Offer } from "@/components/Provider";
import { getForumKreuzbergOffers } from "@/utils/getForumKreuzbergOffers";
import { NextResponse } from "next/server";

export async function GET() {
    const data = await getForumKreuzbergOffers();
    return NextResponse.json(data) as NextResponse<{ data: Offer[]; errors: string }>;
}
