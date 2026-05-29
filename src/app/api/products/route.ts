import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { generateId } from "@/lib/id";
import { z } from "zod";
import { desc, sql } from "drizzle-orm";

const createProductSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(), // auto-generated if not provided
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

    // Auto-generate SKU if not provided
    const countRes = await db.select({ count: sql<number>`count(*)::int` }).from(products);
    const count = (countRes[0]?.count ?? 0) + 1;
    const sku = data.sku?.trim() || `SKU-${String(count).padStart(4, "0")}`;

    const [product] = await db
      .insert(products)
      .values({ id, ...data, sku })
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
