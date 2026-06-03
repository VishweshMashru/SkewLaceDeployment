import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { generateId } from "@/lib/id";
import { z } from "zod";
import { desc } from "drizzle-orm";

const createProductSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  designNumber: z.string().optional(),
  colorCategory: z.string().optional(),
  imageUrl: z.string().optional(),
  metersPerPiece: z.string().optional(),
  size: z.string().optional(),
  rate: z.string().optional(),
});

export async function GET() {
  try {
    const all = await db.select().from(products).orderBy(desc(products.createdAt));
    return NextResponse.json(all);
  } catch (e) {
    console.error("GET /api/products error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createProductSchema.parse(body);
    const id = generateId("PRD");

    // Auto-generate SKU based on highest existing SKU number — avoids collisions on delete
    let sku = data.sku?.trim() || "";
    if (!sku) {
      const existing = await db.select({ sku: products.sku }).from(products);
      const maxNum = existing.reduce((max, p) => {
        const match = p.sku.match(/SKU-(\d+)/);
        if (match) return Math.max(max, parseInt(match[1]));
        return max;
      }, 0);
      sku = `SKU-${String(maxNum + 1).padStart(4, "0")}`;
    }

    const [product] = await db
      .insert(products)
      .values({
        id,
        name: data.name,
        sku,
        designNumber: data.designNumber,
        colorCategory: data.colorCategory,
        imageUrl: data.imageUrl,
        metersPerPiece: data.metersPerPiece,
        size: data.size,
        rate: data.rate,
      })
      .returning();

    return NextResponse.json(product, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error" }, { status: 400 });
    }
    console.error("POST /api/products error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";