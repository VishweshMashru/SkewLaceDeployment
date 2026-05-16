import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { generateId } from "@/lib/id";
import { z } from "zod";
import { desc } from "drizzle-orm";

const createProductSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  designNumber: z.string().optional(),
  colorCategory: z.string().optional(),
  imageUrl: z.string().optional(),
});

export async function GET() {
  try {
    console.log("DATABASE_URL present:", !!process.env.DATABASE_URL);
    console.log("DATABASE_URL prefix:", process.env.DATABASE_URL?.slice(0, 30));
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
    const [product] = await db
      .insert(products)
      .values({ id, ...data })
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
