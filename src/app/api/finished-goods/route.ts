import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { finishedGoods, products } from "@/db/schema";
import { generateId } from "@/lib/id";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";

const createFGSchema = z.object({
  productId: z.string().min(1),
  trackingType: z.enum(["piece", "dozen", "manual"]),
  quantity: z.number().int().positive(),
});

export async function GET() {
  try {
    const all = await db
      .select({
        fg: finishedGoods,
        product: products,
      })
      .from(finishedGoods)
      .leftJoin(products, eq(finishedGoods.productId, products.id))
      .orderBy(desc(finishedGoods.createdAt));
    return NextResponse.json(all);
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch finished goods" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createFGSchema.parse(body);

    const product = await db.query.products.findFirst({
      where: eq(products.id, data.productId),
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const trackingLabel =
      data.trackingType === "piece"
        ? "1 pc"
        : data.trackingType === "dozen"
        ? "1 dozen"
        : `${data.quantity} pcs`;

    const label = `${product.name}${product.designNumber ? ` - Design ${product.designNumber}` : ""} (${trackingLabel})`;

    const id = generateId("FG");
    const [fg] = await db
      .insert(finishedGoods)
      .values({
        id,
        productId: data.productId,
        trackingType: data.trackingType,
        quantity: data.trackingType === "piece" ? 1 : data.trackingType === "dozen" ? 12 : data.quantity,
        label,
      })
      .returning();

    return NextResponse.json({ ...fg, product }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error' }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create finished goods label" }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
