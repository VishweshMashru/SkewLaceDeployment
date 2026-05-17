import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cartons, finishedGoods } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cartonId } = await params;
    const { finishedGoodsId } = z.object({ finishedGoodsId: z.string() }).parse(await req.json());

    const carton = await db.query.cartons.findFirst({ where: eq(cartons.id, cartonId) });
    if (!carton) return NextResponse.json({ error: "Carton not found" }, { status: 404 });
    if (carton.status === "dispatched") {
      return NextResponse.json({ error: "Cannot modify a dispatched carton" }, { status: 400 });
    }

    const fg = await db.query.finishedGoods.findFirst({ where: eq(finishedGoods.id, finishedGoodsId) });
    if (!fg || fg.cartonId !== cartonId) {
      return NextResponse.json({ error: "Label not in this carton" }, { status: 400 });
    }

    // Unlink from carton, set back to available
    await db.update(finishedGoods)
      .set({ cartonId: null, status: "available" })
      .where(eq(finishedGoods.id, finishedGoodsId));

    // Subtract from carton total
    await db.update(cartons)
      .set({ totalPieces: sql`${cartons.totalPieces} - ${fg.quantity}` })
      .where(eq(cartons.id, cartonId));

    return NextResponse.json({ success: true, removedQty: fg.quantity });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
