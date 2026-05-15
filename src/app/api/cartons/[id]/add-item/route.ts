import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cartons, finishedGoods } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const addItemSchema = z.object({
  finishedGoodsId: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cartonId } = await params;
    const body = await req.json();
    const { finishedGoodsId } = addItemSchema.parse(body);

    // Check carton exists and is open
    const carton = await db.query.cartons.findFirst({
      where: eq(cartons.id, cartonId),
    });
    if (!carton) {
      return NextResponse.json({ error: "Carton not found" }, { status: 404 });
    }
    if (carton.status !== "open") {
      return NextResponse.json({ error: "Carton is not open" }, { status: 400 });
    }

    // Check finished goods exists and is available
    const fg = await db.query.finishedGoods.findFirst({
      where: eq(finishedGoods.id, finishedGoodsId),
    });
    if (!fg) {
      return NextResponse.json({ error: "Finished goods label not found" }, { status: 404 });
    }
    if (fg.status !== "available") {
      return NextResponse.json(
        { error: `This label is already ${fg.status === "packed" ? "packed in another carton" : "dispatched"}` },
        { status: 400 }
      );
    }

    // Update finished goods: set cartonId and status = packed
    await db
      .update(finishedGoods)
      .set({ cartonId, status: "packed" })
      .where(eq(finishedGoods.id, finishedGoodsId));

    // Update carton total pieces
    await db
      .update(cartons)
      .set({ totalPieces: sql`${cartons.totalPieces} + ${fg.quantity}` })
      .where(eq(cartons.id, cartonId));

    return NextResponse.json({ success: true, addedQty: fg.quantity });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error' }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
