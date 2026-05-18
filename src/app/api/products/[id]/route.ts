import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, finishedGoods } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  designNumber: z.string().nullable().optional(),
  colorCategory: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = updateSchema.parse(await req.json());
    const [updated] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const linked = await db.query.finishedGoods.findFirst({ where: eq(finishedGoods.productId, id) });
    if (linked) {
      return NextResponse.json(
        { error: "Cannot delete — this product has existing labels. Delete the labels first." },
        { status: 400 }
      );
    }
    const [deleted] = await db.delete(products).where(eq(products.id, id)).returning();
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
