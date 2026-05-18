import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { cartons, finishedGoods } from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cartonId } = await params;
    const { ids } = z.object({ ids: z.array(z.string()).min(1) }).parse(await req.json());

    const carton = await db.query.cartons.findFirst({ where: eq(cartons.id, cartonId) });
    if (!carton) return NextResponse.json({ error: "Carton not found" }, { status: 404 });
    if (carton.status !== "open") return NextResponse.json({ error: "Carton is not open" }, { status: 400 });

    // Fetch all requested labels in one query
    const fgItems = await db.select().from(finishedGoods)
      .where(inArray(finishedGoods.id, ids));

    // Only pack available ones
    const available = fgItems.filter(fg => fg.status === "available");
    if (!available.length) return NextResponse.json({ error: "No available labels found" }, { status: 400 });

    const availableIds = available.map(fg => fg.id);
    const totalQty = available.reduce((sum, fg) => sum + fg.quantity, 0);

    // Update all in one query
    await db.update(finishedGoods)
      .set({ cartonId, status: "packed" })
      .where(inArray(finishedGoods.id, availableIds));

    await db.update(cartons)
      .set({ totalPieces: sql`${cartons.totalPieces} + ${totalQty}` })
      .where(eq(cartons.id, cartonId));

    return NextResponse.json({
      success: true,
      added: available.length,
      skipped: ids.length - available.length,
      totalQty,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
