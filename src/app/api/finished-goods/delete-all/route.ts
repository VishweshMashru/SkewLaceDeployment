import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { finishedGoods } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

export async function POST(req: NextRequest) {
  try {
    const { productId, status } = z.object({
      productId: z.string().min(1),
      status: z.enum(["available", "all"]).default("available"),
    }).parse(await req.json());

    const conditions = status === "available"
      ? and(eq(finishedGoods.productId, productId), eq(finishedGoods.status, "available"))
      : eq(finishedGoods.productId, productId);

    const deleted = await db.delete(finishedGoods)
      .where(conditions)
      .returning({ id: finishedGoods.id });

    return NextResponse.json({ deleted: deleted.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
