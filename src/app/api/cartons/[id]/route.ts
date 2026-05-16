import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cartons, finishedGoods, products } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const carton = await db.query.cartons.findFirst({
      where: eq(cartons.id, id),
    });
    if (!carton) {
      return NextResponse.json({ error: "Carton not found" }, { status: 404 });
    }

    const items = await db
      .select({
        fg: finishedGoods,
        product: products,
      })
      .from(finishedGoods)
      .leftJoin(products, eq(finishedGoods.productId, products.id))
      .where(eq(finishedGoods.cartonId, id));

    const summary: Record<string, { productName: string; sku: string; colorCategory: string | null; designNumber: string | null; totalPieces: number; items: number }> = {};
    for (const row of items) {
      const pid = row.fg.productId;
      if (!summary[pid]) {
        summary[pid] = {
          productName: row.product?.name ?? "Unknown",
          sku: row.product?.sku ?? "",
          colorCategory: row.product?.colorCategory ?? null,
          designNumber: row.product?.designNumber ?? null,
          totalPieces: 0,
          items: 0,
        };
      }
      summary[pid].totalPieces += row.fg.quantity;
      summary[pid].items += 1;
    }

    return NextResponse.json({ carton, items, summary: Object.values(summary) });
  } catch {
    return NextResponse.json({ error: "Failed to fetch carton" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Unlink all finished goods from this carton (set them back to available)
    await db
      .update(finishedGoods)
      .set({ cartonId: null, status: "available" })
      .where(eq(finishedGoods.cartonId, id));

    const [deleted] = await db.delete(cartons).where(eq(cartons.id, id)).returning();
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete carton" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
