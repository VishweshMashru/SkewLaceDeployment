import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orderLines } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = z.object({
      productId: z.string().nullable().optional(),
      productName: z.string().optional(),
      colorCategory: z.string().nullable().optional(),
      designNumber: z.string().nullable().optional(),
      targetQty: z.number().int().min(1).optional(),
    }).parse(await req.json());

    const [updated] = await db.update(orderLines)
      .set(body)
      .where(eq(orderLines.id, id))
      .returning();

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
