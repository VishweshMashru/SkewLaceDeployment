import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { finishedGoods, products, cartons } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rows = await db
      .select({
        fg: finishedGoods,
        product: products,
        carton: cartons,
      })
      .from(finishedGoods)
      .leftJoin(products, eq(finishedGoods.productId, products.id))
      .leftJoin(cartons, eq(finishedGoods.cartonId, cartons.id))
      .where(eq(finishedGoods.id, id));

    if (!rows.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const fg = await db.query.finishedGoods.findFirst({
      where: eq(finishedGoods.id, id),
    });
    if (!fg) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // If packed in a carton, subtract from carton total first
    if (fg.cartonId) {
      await db
        .update(cartons)
        .set({ totalPieces: sql`${cartons.totalPieces} - ${fg.quantity}` })
        .where(eq(cartons.id, fg.cartonId));
    }

    await db.delete(finishedGoods).where(eq(finishedGoods.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete label" }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
