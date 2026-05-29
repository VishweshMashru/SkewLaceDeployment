import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    // Storage carton items count as "in stock" (available)
    const rows = await db.execute(sql`
      SELECT
        p.id AS product_id,
        p.name,
        p.sku,
        p.design_number,
        p.color_category,
        p.image_url,
        COUNT(*) FILTER (WHERE fg.status = 'available')   AS available_labels,
        COUNT(*) FILTER (WHERE fg.status = 'packed' AND (c.purpose = 'storage' OR c.id IS NULL AND fg.status = 'packed'))   AS storage_labels,
        COUNT(*) FILTER (WHERE fg.status = 'packed' AND c.purpose = 'dispatch') AS packed_labels,
        COUNT(*) FILTER (WHERE fg.status = 'dispatched')  AS dispatched_labels,
        COALESCE(SUM(fg.quantity) FILTER (WHERE fg.status = 'available'), 0) AS available_pieces,
        COALESCE(SUM(fg.quantity) FILTER (WHERE fg.status = 'packed' AND c.purpose = 'storage'), 0) AS storage_pieces,
        COALESCE(SUM(fg.quantity) FILTER (WHERE fg.status = 'packed' AND c.purpose = 'dispatch'), 0) AS packed_pieces,
        COALESCE(SUM(fg.quantity) FILTER (WHERE fg.status = 'dispatched'), 0) AS dispatched_pieces,
        -- Total in stock = available (loose) + in storage cartons
        COALESCE(SUM(fg.quantity) FILTER (WHERE fg.status = 'available'), 0) +
        COALESCE(SUM(fg.quantity) FILTER (WHERE fg.status = 'packed' AND c.purpose = 'storage'), 0) AS total_in_stock
      FROM products p
      LEFT JOIN finished_goods fg ON fg.product_id = p.id
      LEFT JOIN cartons c ON c.id = fg.carton_id
      GROUP BY p.id, p.name, p.sku, p.design_number, p.color_category, p.image_url
      ORDER BY p.name ASC
    `);

    const toArray = (res: any) => Array.isArray(res) ? res : (res.rows ?? []);
    return NextResponse.json(toArray(rows));
  } catch (e) {
    console.error("Inventory error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
