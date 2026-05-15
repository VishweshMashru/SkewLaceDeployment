import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ products: [], labels: [], cartons: [] });
  }

  const pattern = `%${q}%`;

  try {
    const [matchedProducts, matchedLabels, matchedCartons] = await Promise.all([
      db.execute(sql`
        SELECT * FROM products
        WHERE name ILIKE ${pattern}
           OR sku ILIKE ${pattern}
           OR design_number ILIKE ${pattern}
           OR color_category ILIKE ${pattern}
        LIMIT 10
      `),
      db.execute(sql`
        SELECT fg.*, p.name AS product_name, p.sku AS product_sku,
               p.design_number, p.color_category, p.id AS product_id
        FROM finished_goods fg
        LEFT JOIN products p ON fg.product_id = p.id
        WHERE fg.id ILIKE ${pattern}
           OR fg.label ILIKE ${pattern}
           OR fg.status::text ILIKE ${pattern}
           OR p.name ILIKE ${pattern}
           OR p.sku ILIKE ${pattern}
        LIMIT 20
      `),
      db.execute(sql`
        SELECT * FROM cartons
        WHERE carton_number ILIKE ${pattern}
           OR status::text ILIKE ${pattern}
           OR notes ILIKE ${pattern}
        LIMIT 10
      `),
    ]);

    const toArray = (res: any) => Array.isArray(res) ? res : (res.rows ?? []);

    const labels = toArray(matchedLabels).map((row: any) => ({
      fg: {
        id: row.id,
        productId: row.product_id,
        trackingType: row.tracking_type,
        quantity: row.quantity,
        status: row.status,
        cartonId: row.carton_id,
        label: row.label,
        createdAt: row.created_at,
      },
      product: row.product_name ? {
        id: row.product_id,
        name: row.product_name,
        sku: row.product_sku,
        designNumber: row.design_number,
        colorCategory: row.color_category,
      } : null,
    }));

    return NextResponse.json({
      products: toArray(matchedProducts),
      labels,
      cartons: toArray(matchedCartons),
    });
  } catch (e) {
    console.error("Search error:", e);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";