import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { batches, cartons, finishedGoods, products } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const batch = await db.query.batches.findFirst({ where: eq(batches.id, id) });
    if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const batchCartons = await db.select().from(cartons)
      .where(eq(cartons.batchId, id))
      .orderBy(cartons.createdAt);

    // Full product breakdown across all cartons in this batch
    const breakdown = await db.execute(sql`
      SELECT
        p.id AS product_id,
        p.name,
        p.sku,
        p.design_number,
        p.color_category,
        p.image_url,
        COUNT(fg.id) AS label_count,
        COALESCE(SUM(fg.quantity), 0) AS total_pieces
      FROM finished_goods fg
      JOIN products p ON fg.product_id = p.id
      JOIN cartons c ON fg.carton_id = c.id
      WHERE c.batch_id = ${id}
      GROUP BY p.id, p.name, p.sku, p.design_number, p.color_category, p.image_url
      ORDER BY p.name ASC
    `);

    const toArray = (res: any) => Array.isArray(res) ? res : (res.rows ?? []);

    return NextResponse.json({
      batch,
      cartons: batchCartons,
      breakdown: toArray(breakdown),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Unlink cartons from this batch
    await db.update(cartons).set({ batchId: null }).where(eq(cartons.batchId, id));
    await db.delete(batches).where(eq(batches.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
