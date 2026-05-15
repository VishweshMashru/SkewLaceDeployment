import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, finishedGoods } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if any finished goods labels use this product
    const linked = await db.query.finishedGoods.findFirst({
      where: eq(finishedGoods.productId, id),
    });
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
