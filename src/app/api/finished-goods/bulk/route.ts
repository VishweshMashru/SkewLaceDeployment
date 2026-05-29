import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { finishedGoods, products } from "@/db/schema";
import { generateId } from "@/lib/id";
import { z } from "zod";
import { eq } from "drizzle-orm";

const bulkSchema = z.object({
  productId: z.string().min(1),
  count: z.number().int().min(1).max(9999),
  trackingType: z.enum(["piece", "dozen", "manual"]),
  quantity: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = bulkSchema.parse(body);

    const product = await db.query.products.findFirst({
      where: eq(products.id, data.productId),
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const trackingLabel =
      data.trackingType === "piece" ? "1 pc"
      : data.trackingType === "dozen" ? "1 dozen"
      : `${data.quantity} pcs`;

    const label = `${product.name}${product.designNumber ? ` - Design ${product.designNumber}` : ""} (${trackingLabel})`;

    const rows = Array.from({ length: data.count }, () => ({
      id: generateId("FG"),
      productId: data.productId,
      trackingType: data.trackingType,
      quantity: data.quantity,
      label,
    }));

    const created = await db.insert(finishedGoods).values(rows).returning();
    return NextResponse.json({ created, product }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create bulk labels" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
