import { ScraperResponse } from "@/types";
import { get1892Offers } from "@/utils/get1892Offers";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<ScraperResponse>> {
    const data = await get1892Offers();
    return NextResponse.json(data);
}
