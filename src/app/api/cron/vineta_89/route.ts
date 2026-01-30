import { ScraperResponse } from "@/types";
import { getVineta89Offers } from "@/utils/getVineta89Offers";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<ScraperResponse>> {
    const data = await getVineta89Offers();
    return NextResponse.json(data);
}
